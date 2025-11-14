/*
 * MPU6050 Sensor Service Implementation
 */

#include <zephyr/types.h>
#include <stddef.h>
#include <string.h>
#include <errno.h>
#include <zephyr/sys/printk.h>
#include <zephyr/sys/byteorder.h>
#include <zephyr/kernel.h>

#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/hci.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/bluetooth/uuid.h>
#include <zephyr/bluetooth/gatt.h>

#include "mpu6050_service.h"

#include <zephyr/logging/log.h>

LOG_MODULE_REGISTER(mpu6050_service, LOG_LEVEL_INF);

// Données actuelles des capteurs
static struct sensor_data current_accel = {0, 0, 0};
static struct sensor_data current_gyro = {0, 0, 0};

// Callback de lecture pour l'accéléromètre
static ssize_t read_accel(struct bt_conn *conn, const struct bt_gatt_attr *attr,
			  void *buf, uint16_t len, uint16_t offset)
{
	const struct sensor_data *data = attr->user_data;
	
	// Formater les données en big-endian (standard BLE)
	uint8_t value[6];
	sys_put_be16(data->x, &value[0]);
	sys_put_be16(data->y, &value[2]);
	sys_put_be16(data->z, &value[4]);
	
	LOG_DBG("Accel read: X=%d Y=%d Z=%d", data->x, data->y, data->z);
	
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(value));
}

// Callback de lecture pour le gyroscope
static ssize_t read_gyro(struct bt_conn *conn, const struct bt_gatt_attr *attr,
			 void *buf, uint16_t len, uint16_t offset)
{
	const struct sensor_data *data = attr->user_data;
	
	// Formater les données en big-endian (standard BLE)
	uint8_t value[6];
	sys_put_be16(data->x, &value[0]);
	sys_put_be16(data->y, &value[2]);
	sys_put_be16(data->z, &value[4]);
	
	LOG_DBG("Gyro read: X=%d Y=%d Z=%d", data->x, data->y, data->z);
	
	return bt_gatt_attr_read(conn, attr, buf, len, offset, value, sizeof(value));
}

// Définition du service MPU6050
BT_GATT_SERVICE_DEFINE(mpu6050_svc,
	BT_GATT_PRIMARY_SERVICE(BT_UUID_MPU6050_SERVICE),
	
	// Caractéristique Accéléromètre (Read + Notify)
	BT_GATT_CHARACTERISTIC(BT_UUID_MPU6050_ACCEL,
			       BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY,
			       BT_GATT_PERM_READ,
			       read_accel, NULL, &current_accel),
	BT_GATT_CCC(NULL, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
	
	// Caractéristique Gyroscope (Read + Notify)
	BT_GATT_CHARACTERISTIC(BT_UUID_MPU6050_GYRO,
			       BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY,
			       BT_GATT_PERM_READ,
			       read_gyro, NULL, &current_gyro),
	BT_GATT_CCC(NULL, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
);

int mpu6050_service_init(void)
{
	LOG_INF("MPU6050 BLE Service initialized");
	return 0;
}

int mpu6050_update_accel(const struct sensor_data *accel_data)
{
	if (!accel_data) {
		return -EINVAL;
	}
	
	// Copier les nouvelles données
	memcpy(&current_accel, accel_data, sizeof(struct sensor_data));
	
	// Notifier les clients BLE si connectés
	uint8_t value[6];
	sys_put_be16(accel_data->x, &value[0]);
	sys_put_be16(accel_data->y, &value[2]);
	sys_put_be16(accel_data->z, &value[4]);
	
	bt_gatt_notify(NULL, &mpu6050_svc.attrs[1], value, sizeof(value));
	
	return 0;
}

int mpu6050_update_gyro(const struct sensor_data *gyro_data)
{
	if (!gyro_data) {
		return -EINVAL;
	}
	
	// Copier les nouvelles données
	memcpy(&current_gyro, gyro_data, sizeof(struct sensor_data));
	
	// Notifier les clients BLE si connectés
	uint8_t value[6];
	sys_put_be16(gyro_data->x, &value[0]);
	sys_put_be16(gyro_data->y, &value[2]);
	sys_put_be16(gyro_data->z, &value[4]);
	
	bt_gatt_notify(NULL, &mpu6050_svc.attrs[4], value, sizeof(value));
	
	return 0;
}
