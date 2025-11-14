/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 * Modified pour intégrer le capteur MPU6050 (GY-6180)
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-5-Clause
 */

#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gap.h>
#include <zephyr/bluetooth/uuid.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/device.h>
#include <zephyr/drivers/i2c.h>

#include <dk_buttons_and_leds.h>
#include "my_lbs.h"
#include "mpu6050_service.h"

static const struct bt_le_adv_param *adv_param = BT_LE_ADV_PARAM(
	(BT_LE_ADV_OPT_CONN |
	 BT_LE_ADV_OPT_USE_IDENTITY),
	800,
	801,
	NULL);

LOG_MODULE_REGISTER(nRF_MPU6050, LOG_LEVEL_INF);

#define DEVICE_NAME CONFIG_BT_DEVICE_NAME
#define DEVICE_NAME_LEN (sizeof(DEVICE_NAME) - 1)

#define RUN_STATUS_LED DK_LED1
#define CON_STATUS_LED DK_LED2
#define USER_LED DK_LED3
#define USER_BUTTON DK_BTN1_MSK

#define RUN_LED_BLINK_INTERVAL 1000

// Configuration I2C pour MPU6050
#define MPU6050_I2C_NODE DT_NODELABEL(i2c0)
#define MPU6050_ADDR 0x68

// Registres MPU6050
#define MPU6050_REG_PWR_MGMT_1 0x6B
#define MPU6050_REG_ACCEL_XOUT_H 0x3B
#define MPU6050_REG_GYRO_XOUT_H 0x43

static bool app_button_state;
static struct k_work adv_work;
static const struct device *i2c_dev;

// Timer pour lecture périodique du capteur
static struct k_timer sensor_timer;

static const struct bt_data ad[] = {
	BT_DATA_BYTES(BT_DATA_FLAGS, (BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR)),
	BT_DATA(BT_DATA_NAME_COMPLETE, DEVICE_NAME, DEVICE_NAME_LEN),
};

static const struct bt_data sd[] = {
	BT_DATA_BYTES(BT_DATA_UUID128_ALL, BT_UUID_LBS_VAL),
	BT_DATA_BYTES(BT_DATA_UUID128_ALL, BT_UUID_MPU6050_SERVICE_VAL),
};

static void adv_work_handler(struct k_work *work)
{
	int err = bt_le_adv_start(adv_param, ad, ARRAY_SIZE(ad), sd, ARRAY_SIZE(sd));

	if (err) {
		printk("Advertising failed to start (err %d)\n", err);
		return;
	}

	printk("Advertising successfully started\n");
}

static void advertising_start(void)
{
	k_work_submit(&adv_work);
}

static void recycled_cb(void)
{
	printk("Connection object available. Restarting advertising!\n");
	advertising_start();
}

static void app_led_cb(bool led_state)
{
	dk_set_led(USER_LED, led_state);
}

static bool app_button_cb(void)
{
	return app_button_state;
}

static struct my_lbs_cb app_callbacks = {
	.led_cb = app_led_cb,
	.button_cb = app_button_cb,
};

static void button_changed(uint32_t button_state, uint32_t has_changed)
{
	if (has_changed & USER_BUTTON) {
		uint32_t user_button_state = button_state & USER_BUTTON;
		app_button_state = user_button_state ? true : false;
	}
}

static void on_connected(struct bt_conn *conn, uint8_t err)
{
	if (err) {
		printk("Connection failed (err %u)\n", err);
		return;
	}

	printk("Connected\n");
	dk_set_led_on(CON_STATUS_LED);
}

static void on_disconnected(struct bt_conn *conn, uint8_t reason)
{
	printk("Disconnected (reason %u)\n", reason);
	dk_set_led_off(CON_STATUS_LED);
}

struct bt_conn_cb connection_callbacks = {
	.connected = on_connected,
	.disconnected = on_disconnected,
	.recycled = recycled_cb,
};

static int init_button(void)
{
	int err;

	err = dk_buttons_init(button_changed);
	if (err) {
		printk("Cannot init buttons (err: %d)\n", err);
	}

	return err;
}

// Initialiser le MPU6050
static int mpu6050_init(void)
{
	uint8_t config[2];
	int ret;

	// Vérifier que le bus I2C est prêt
	if (!device_is_ready(i2c_dev)) {
		LOG_ERR("I2C device not ready");
		return -ENODEV;
	}

	// Wake up le MPU6050 (sortir du mode sleep)
	config[0] = MPU6050_REG_PWR_MGMT_1;
	config[1] = 0x00;
	ret = i2c_write(i2c_dev, config, 2, MPU6050_ADDR);
	if (ret) {
		LOG_ERR("Failed to wake up MPU6050 (err %d)", ret);
		return ret;
	}

	k_sleep(K_MSEC(100)); // Attendre que le capteur se stabilise

	LOG_INF("MPU6050 initialized successfully");
	return 0;
}

// Lire les données du MPU6050
static int mpu6050_read_data(struct sensor_data *accel, struct sensor_data *gyro)
{
	uint8_t data[14];
	int ret;

	// Lire les 14 bytes de données (accel + temp + gyro)
	ret = i2c_burst_read(i2c_dev, MPU6050_ADDR, MPU6050_REG_ACCEL_XOUT_H, data, 14);
	if (ret) {
		LOG_ERR("Failed to read MPU6050 data (err %d)", ret);
		return ret;
	}

	// Parser les données (big-endian)
	accel->x = (int16_t)((data[0] << 8) | data[1]);
	accel->y = (int16_t)((data[2] << 8) | data[3]);
	accel->z = (int16_t)((data[4] << 8) | data[5]);
	
	gyro->x = (int16_t)((data[8] << 8) | data[9]);
	gyro->y = (int16_t)((data[10] << 8) | data[11]);
	gyro->z = (int16_t)((data[12] << 8) | data[13]);

	return 0;
}

// Timer callback pour lecture périodique du capteur
static void sensor_timer_handler(struct k_timer *timer)
{
	struct sensor_data accel, gyro;
	int ret;

	ret = mpu6050_read_data(&accel, &gyro);
	if (ret) {
		return;
	}

	// Mettre à jour les caractéristiques BLE
	mpu6050_update_accel(&accel);
	mpu6050_update_gyro(&gyro);

	// Log pour debug
	LOG_DBG("Accel: X=%d Y=%d Z=%d | Gyro: X=%d Y=%d Z=%d",
		accel.x, accel.y, accel.z, gyro.x, gyro.y, gyro.z);
}

int main(void)
{
	int blink_status = 0;
	int err;

	LOG_INF("Starting nRF52833 with MPU6050 Sensor");

	// Initialiser les LEDs
	err = dk_leds_init();
	if (err) {
		LOG_ERR("LEDs init failed (err %d)", err);
		return -1;
	}

	// Initialiser les boutons
	err = init_button();
	if (err) {
		printk("Button init failed (err %d)\n", err);
		return -1;
	}

	// Initialiser le bus I2C
	i2c_dev = DEVICE_DT_GET(MPU6050_I2C_NODE);
	if (!device_is_ready(i2c_dev)) {
		LOG_ERR("I2C device not found!");
		return -1;
	}

	// Initialiser le MPU6050
	err = mpu6050_init();
	if (err) {
		LOG_ERR("MPU6050 init failed (err %d)", err);
		return -1;
	}

	// Initialiser Bluetooth
	err = bt_enable(NULL);
	if (err) {
		LOG_ERR("Bluetooth init failed (err %d)", err);
		return -1;
	}
	bt_conn_cb_register(&connection_callbacks);

	// Initialiser les services BLE
	err = my_lbs_init(&app_callbacks);
	if (err) {
		printk("Failed to init LBS (err:%d)\n", err);
		return -1;
	}

	err = mpu6050_service_init();
	if (err) {
		printk("Failed to init MPU6050 service (err:%d)\n", err);
		return -1;
	}

	LOG_INF("Bluetooth initialized");
	k_work_init(&adv_work, adv_work_handler);
	advertising_start();

	// Démarrer le timer pour lecture périodique (500ms)
	k_timer_init(&sensor_timer, sensor_timer_handler, NULL);
	k_timer_start(&sensor_timer, K_MSEC(500), K_MSEC(500));

	LOG_INF("MPU6050 sensor reading started (every 500ms)");

	// Boucle principale
	for (;;) {
		dk_set_led(RUN_STATUS_LED, (++blink_status) % 2);
		k_sleep(K_MSEC(RUN_LED_BLINK_INTERVAL));
	}
}
