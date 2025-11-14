/*
 * BME280 BLE Service Implementation
 */

#include <zephyr/types.h>
#include <stddef.h>
#include <string.h>
#include <errno.h>
#include <zephyr/sys/byteorder.h>
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>

#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/hci.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/bluetooth/uuid.h>
#include <zephyr/bluetooth/gatt.h>

#include "bme280_service.h"

LOG_MODULE_REGISTER(bme280_service, LOG_LEVEL_DBG);

// Buffers pour stocker les données
static int16_t temperature_value;    // En centièmes de °C
static uint16_t humidity_value;      // En centièmes de %
static uint32_t pressure_value;      // En Pascals

// CCC descriptors pour les notifications
static struct bt_gatt_ccc_cfg temperature_ccc_cfg[BT_GATT_CCC_MAX] = {};
static struct bt_gatt_ccc_cfg humidity_ccc_cfg[BT_GATT_CCC_MAX] = {};
static struct bt_gatt_ccc_cfg pressure_ccc_cfg[BT_GATT_CCC_MAX] = {};

static void temperature_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
	ARG_UNUSED(attr);
	bool notif_enabled = (value == BT_GATT_CCC_NOTIFY);
	LOG_INF("Temperature notifications %s", notif_enabled ? "enabled" : "disabled");
}

static void humidity_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
	ARG_UNUSED(attr);
	bool notif_enabled = (value == BT_GATT_CCC_NOTIFY);
	LOG_INF("Humidity notifications %s", notif_enabled ? "enabled" : "disabled");
}

static void pressure_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
	ARG_UNUSED(attr);
	bool notif_enabled = (value == BT_GATT_CCC_NOTIFY);
	LOG_INF("Pressure notifications %s", notif_enabled ? "enabled" : "disabled");
}

static ssize_t read_temperature(struct bt_conn *conn,
			       const struct bt_gatt_attr *attr, void *buf,
			       uint16_t len, uint16_t offset)
{
	int16_t value = sys_cpu_to_le16(temperature_value);
	return bt_gatt_attr_read(conn, attr, buf, len, offset, &value, sizeof(value));
}

static ssize_t read_humidity(struct bt_conn *conn,
			    const struct bt_gatt_attr *attr, void *buf,
			    uint16_t len, uint16_t offset)
{
	uint16_t value = sys_cpu_to_le16(humidity_value);
	return bt_gatt_attr_read(conn, attr, buf, len, offset, &value, sizeof(value));
}

static ssize_t read_pressure(struct bt_conn *conn,
			    const struct bt_gatt_attr *attr, void *buf,
			    uint16_t len, uint16_t offset)
{
	uint32_t value = sys_cpu_to_le32(pressure_value);
	return bt_gatt_attr_read(conn, attr, buf, len, offset, &value, sizeof(value));
}

// Service BME280
BT_GATT_SERVICE_DEFINE(bme280_svc,
	BT_GATT_PRIMARY_SERVICE(BT_UUID_BME280_SERVICE),
	
	// Température
	BT_GATT_CHARACTERISTIC(BT_UUID_DECLARE_128(BT_UUID_TEMPERATURE_CHAR_VAL),
			       BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY,
			       BT_GATT_PERM_READ, read_temperature, NULL, NULL),
	BT_GATT_CCC(temperature_ccc_cfg, temperature_ccc_changed),
	
	// Humidité
	BT_GATT_CHARACTERISTIC(BT_UUID_DECLARE_128(BT_UUID_HUMIDITY_CHAR_VAL),
			       BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY,
			       BT_GATT_PERM_READ, read_humidity, NULL, NULL),
	BT_GATT_CCC(humidity_ccc_cfg, humidity_ccc_changed),
	
	// Pression
	BT_GATT_CHARACTERISTIC(BT_UUID_DECLARE_128(BT_UUID_PRESSURE_CHAR_VAL),
			       BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY,
			       BT_GATT_PERM_READ, read_pressure, NULL, NULL),
	BT_GATT_CCC(pressure_ccc_cfg, pressure_ccc_changed),
);

int bme280_service_init(void)
{
	LOG_INF("BME280 service initialized");
	return 0;
}

void bme280_update_temperature(int16_t temp)
{
	temperature_value = temp;
	bt_gatt_notify(NULL, &bme280_svc.attrs[1], &temperature_value, sizeof(temperature_value));
}

void bme280_update_humidity(uint16_t humidity)
{
	humidity_value = humidity;
	bt_gatt_notify(NULL, &bme280_svc.attrs[4], &humidity_value, sizeof(humidity_value));
}

void bme280_update_pressure(uint32_t pressure)
{
	pressure_value = pressure;
	bt_gatt_notify(NULL, &bme280_svc.attrs[7], &pressure_value, sizeof(pressure_value));
}
