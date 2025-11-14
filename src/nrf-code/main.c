/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 * Modified pour intégrer le capteur BME280
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
#include "bme280_service.h"

static const struct bt_le_adv_param *adv_param = BT_LE_ADV_PARAM(
	(BT_LE_ADV_OPT_CONN |
	 BT_LE_ADV_OPT_USE_IDENTITY),
	800,
	801,
	NULL);

LOG_MODULE_REGISTER(nRF_BME280, LOG_LEVEL_INF);

#define DEVICE_NAME CONFIG_BT_DEVICE_NAME
#define DEVICE_NAME_LEN (sizeof(DEVICE_NAME) - 1)

#define RUN_STATUS_LED DK_LED1
#define CON_STATUS_LED DK_LED2
#define USER_LED DK_LED3
#define USER_BUTTON DK_BTN1_MSK

#define RUN_LED_BLINK_INTERVAL 1000

// Configuration I2C pour BME280
#define BME280_I2C_NODE DT_NODELABEL(i2c0)
#define BME280_ADDR 0x76  // Peut être 0x77 selon le modèle

// Registres BME280
#define BME280_REG_ID 0xD0
#define BME280_REG_CTRL_MEAS 0xF4
#define BME280_REG_CONFIG 0xF5
#define BME280_REG_CTRL_HUM 0xF2
#define BME280_REG_PRESS_MSB 0xF7
#define BME280_CHIP_ID 0x60

// Calibration data registers
#define BME280_REG_DIG_T1 0x88

static bool app_button_state;
static struct k_work adv_work;
static const struct device *i2c_dev;

// Timer pour lecture périodique du capteur
static struct k_timer sensor_timer;

// Données de calibration BME280
struct bme280_calib_data {
	uint16_t dig_T1;
	int16_t dig_T2;
	int16_t dig_T3;
	uint16_t dig_P1;
	int16_t dig_P2;
	int16_t dig_P3;
	int16_t dig_P4;
	int16_t dig_P5;
	int16_t dig_P6;
	int16_t dig_P7;
	int16_t dig_P8;
	int16_t dig_P9;
	uint8_t dig_H1;
	int16_t dig_H2;
	uint8_t dig_H3;
	int16_t dig_H4;
	int16_t dig_H5;
	int8_t dig_H6;
	int32_t t_fine;
};

static struct bme280_calib_data calib;

static const struct bt_data ad[] = {
	BT_DATA_BYTES(BT_DATA_FLAGS, (BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR)),
	BT_DATA(BT_DATA_NAME_COMPLETE, DEVICE_NAME, DEVICE_NAME_LEN),
};

static const struct bt_data sd[] = {
	BT_DATA_BYTES(BT_DATA_UUID128_ALL, BT_UUID_LBS_VAL),
	BT_DATA_BYTES(BT_DATA_UUID128_ALL, BT_UUID_BME280_SERVICE_VAL),
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

// Lire les données de calibration
static int bme280_read_calibration(void)
{
	uint8_t calib_data[24];
	int ret;

	// Lire calibration température et pression
	ret = i2c_burst_read(i2c_dev, BME280_ADDR, BME280_REG_DIG_T1, calib_data, 24);
	if (ret) {
		LOG_ERR("Failed to read calibration data (err %d)", ret);
		return ret;
	}

	calib.dig_T1 = (calib_data[1] << 8) | calib_data[0];
	calib.dig_T2 = (calib_data[3] << 8) | calib_data[2];
	calib.dig_T3 = (calib_data[5] << 8) | calib_data[4];
	calib.dig_P1 = (calib_data[7] << 8) | calib_data[6];
	calib.dig_P2 = (calib_data[9] << 8) | calib_data[8];
	calib.dig_P3 = (calib_data[11] << 8) | calib_data[10];
	calib.dig_P4 = (calib_data[13] << 8) | calib_data[12];
	calib.dig_P5 = (calib_data[15] << 8) | calib_data[14];
	calib.dig_P6 = (calib_data[17] << 8) | calib_data[16];
	calib.dig_P7 = (calib_data[19] << 8) | calib_data[18];
	calib.dig_P8 = (calib_data[21] << 8) | calib_data[20];
	calib.dig_P9 = (calib_data[23] << 8) | calib_data[22];

	// Lire calibration humidité
	uint8_t h_calib[7];
	ret = i2c_reg_read_byte(i2c_dev, BME280_ADDR, 0xA1, &calib.dig_H1);
	if (ret) return ret;
	
	ret = i2c_burst_read(i2c_dev, BME280_ADDR, 0xE1, h_calib, 7);
	if (ret) return ret;

	calib.dig_H2 = (h_calib[1] << 8) | h_calib[0];
	calib.dig_H3 = h_calib[2];
	calib.dig_H4 = (h_calib[3] << 4) | (h_calib[4] & 0x0F);
	calib.dig_H5 = (h_calib[5] << 4) | (h_calib[4] >> 4);
	calib.dig_H6 = h_calib[6];

	return 0;
}

// Initialiser le BME280
static int bme280_init(void)
{
	uint8_t chip_id;
	uint8_t config[2];
	int ret;

	// Vérifier que le bus I2C est prêt
	if (!device_is_ready(i2c_dev)) {
		LOG_ERR("I2C device not ready");
		return -ENODEV;
	}

	// Vérifier le chip ID
	ret = i2c_reg_read_byte(i2c_dev, BME280_ADDR, BME280_REG_ID, &chip_id);
	if (ret) {
		LOG_ERR("Failed to read chip ID (err %d)", ret);
		return ret;
	}

	if (chip_id != BME280_CHIP_ID) {
		LOG_ERR("Invalid chip ID: 0x%02x (expected 0x60)", chip_id);
		return -EINVAL;
	}

	LOG_INF("BME280 detected (chip ID: 0x%02x)", chip_id);

	// Lire les données de calibration
	ret = bme280_read_calibration();
	if (ret) {
		return ret;
	}

	// Configurer l'humidité (oversampling x1)
	config[0] = BME280_REG_CTRL_HUM;
	config[1] = 0x01;
	ret = i2c_write(i2c_dev, config, 2, BME280_ADDR);
	if (ret) return ret;

	// Configurer le mode normal, oversampling temp et press x1
	config[0] = BME280_REG_CTRL_MEAS;
	config[1] = 0x27; // mode normal, osrs_t=1, osrs_p=1
	ret = i2c_write(i2c_dev, config, 2, BME280_ADDR);
	if (ret) return ret;

	// Configurer le standby time et filter
	config[0] = BME280_REG_CONFIG;
	config[1] = 0xA0; // t_sb=1000ms, filter=off
	ret = i2c_write(i2c_dev, config, 2, BME280_ADDR);
	if (ret) return ret;

	k_sleep(K_MSEC(100));

	LOG_INF("BME280 initialized successfully");
	return 0;
}

// Compenser la température
static int32_t bme280_compensate_temperature(int32_t adc_T)
{
	int32_t var1, var2, T;
	
	var1 = ((((adc_T >> 3) - ((int32_t)calib.dig_T1 << 1))) * ((int32_t)calib.dig_T2)) >> 11;
	var2 = (((((adc_T >> 4) - ((int32_t)calib.dig_T1)) * ((adc_T >> 4) - ((int32_t)calib.dig_T1))) >> 12) * ((int32_t)calib.dig_T3)) >> 14;
	calib.t_fine = var1 + var2;
	T = (calib.t_fine * 5 + 128) >> 8;
	return T;
}

// Compenser la pression
static uint32_t bme280_compensate_pressure(int32_t adc_P)
{
	int64_t var1, var2, p;
	
	var1 = ((int64_t)calib.t_fine) - 128000;
	var2 = var1 * var1 * (int64_t)calib.dig_P6;
	var2 = var2 + ((var1 * (int64_t)calib.dig_P5) << 17);
	var2 = var2 + (((int64_t)calib.dig_P4) << 35);
	var1 = ((var1 * var1 * (int64_t)calib.dig_P3) >> 8) + ((var1 * (int64_t)calib.dig_P2) << 12);
	var1 = (((((int64_t)1) << 47) + var1)) * ((int64_t)calib.dig_P1) >> 33;
	
	if (var1 == 0) {
		return 0;
	}
	
	p = 1048576 - adc_P;
	p = (((p << 31) - var2) * 3125) / var1;
	var1 = (((int64_t)calib.dig_P9) * (p >> 13) * (p >> 13)) >> 25;
	var2 = (((int64_t)calib.dig_P8) * p) >> 19;
	p = ((p + var1 + var2) >> 8) + (((int64_t)calib.dig_P7) << 4);
	
	return (uint32_t)(p / 256);
}

// Compenser l'humidité
static uint32_t bme280_compensate_humidity(int32_t adc_H)
{
	int32_t v_x1_u32r;
	
	v_x1_u32r = (calib.t_fine - ((int32_t)76800));
	v_x1_u32r = (((((adc_H << 14) - (((int32_t)calib.dig_H4) << 20) - (((int32_t)calib.dig_H5) * v_x1_u32r)) +
				((int32_t)16384)) >> 15) * (((((((v_x1_u32r * ((int32_t)calib.dig_H6)) >> 10) *
				(((v_x1_u32r * ((int32_t)calib.dig_H3)) >> 11) + ((int32_t)32768))) >> 10) +
				((int32_t)2097152)) * ((int32_t)calib.dig_H2) + 8192) >> 14));
	v_x1_u32r = (v_x1_u32r - (((((v_x1_u32r >> 15) * (v_x1_u32r >> 15)) >> 7) *
				((int32_t)calib.dig_H1)) >> 4));
	v_x1_u32r = (v_x1_u32r < 0 ? 0 : v_x1_u32r);
	v_x1_u32r = (v_x1_u32r > 419430400 ? 419430400 : v_x1_u32r);
	
	return (uint32_t)(v_x1_u32r >> 12);
}

// Lire les données du BME280
static int bme280_read_data(int32_t *temp, uint32_t *pressure, uint32_t *humidity)
{
	uint8_t data[8];
	int ret;

	// Lire les 8 bytes de données (press + temp + hum)
	ret = i2c_burst_read(i2c_dev, BME280_ADDR, BME280_REG_PRESS_MSB, data, 8);
	if (ret) {
		LOG_ERR("Failed to read BME280 data (err %d)", ret);
		return ret;
	}

	// Parser les données brutes
	int32_t adc_P = (data[0] << 12) | (data[1] << 4) | (data[2] >> 4);
	int32_t adc_T = (data[3] << 12) | (data[4] << 4) | (data[5] >> 4);
	int32_t adc_H = (data[6] << 8) | data[7];

	// Compenser les valeurs
	*temp = bme280_compensate_temperature(adc_T);
	*pressure = bme280_compensate_pressure(adc_P);
	*humidity = bme280_compensate_humidity(adc_H);

	return 0;
}

// Timer callback pour lecture périodique du capteur
static void sensor_timer_handler(struct k_timer *timer)
{
	int32_t temp;
	uint32_t pressure, humidity;
	int ret;

	ret = bme280_read_data(&temp, &pressure, &humidity);
	if (ret) {
		return;
	}

	// Convertir pour BLE (temp en centièmes de °C, humidity en centièmes de %)
	int16_t temp_ble = (int16_t)temp;  // Déjà en centièmes
	uint16_t hum_ble = (uint16_t)((humidity * 100) >> 10);  // Convertir de 1024ths à centièmes
	uint32_t press_ble = pressure;  // En Pascals

	// Mettre à jour les caractéristiques BLE
	bme280_update_temperature(temp_ble);
	bme280_update_humidity(hum_ble);
	bme280_update_pressure(press_ble);

	// Log pour debug
	LOG_INF("Temp: %d.%02d°C | Humidity: %d.%02d%% | Pressure: %d Pa",
		temp / 100, temp % 100,
		hum_ble / 100, hum_ble % 100,
		press_ble);
}

int main(void)
{
	int blink_status = 0;
	int err;

	LOG_INF("Starting nRF52833 with BME280 Sensor");

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
	i2c_dev = DEVICE_DT_GET(BME280_I2C_NODE);
	if (!device_is_ready(i2c_dev)) {
		LOG_ERR("I2C device not found!");
		return -1;
	}

	// Initialiser le BME280
	err = bme280_init();
	if (err) {
		LOG_ERR("BME280 init failed (err %d)", err);
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

	err = bme280_service_init();
	if (err) {
		printk("Failed to init BME280 service (err:%d)\n", err);
		return -1;
	}

	LOG_INF("Bluetooth initialized");
	k_work_init(&adv_work, adv_work_handler);
	advertising_start();

	// Démarrer le timer pour lecture périodique (2 secondes)
	k_timer_init(&sensor_timer, sensor_timer_handler, NULL);
	k_timer_start(&sensor_timer, K_MSEC(2000), K_MSEC(2000));

	LOG_INF("BME280 sensor reading started (every 2 seconds)");

	// Boucle principale
	for (;;) {
		dk_set_led(RUN_STATUS_LED, (++blink_status) % 2);
		k_sleep(K_MSEC(RUN_LED_BLINK_INTERVAL));
	}
}
