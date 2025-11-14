/*
 * BME280 BLE Service
 * Service pour exposer les données du capteur BME280 via BLE
 */

#ifndef BME280_SERVICE_H_
#define BME280_SERVICE_H_

#include <zephyr/types.h>

#ifdef __cplusplus
extern "C" {
#endif

// UUID du service BME280: 0x181A (Environmental Sensing)
#define BT_UUID_BME280_SERVICE_VAL \
	BT_UUID_128_ENCODE(0x0000181a, 0x0000, 0x1000, 0x8000, 0x00805f9b34fb)

#define BT_UUID_BME280_SERVICE BT_UUID_DECLARE_128(BT_UUID_BME280_SERVICE_VAL)

// UUID Température: 0x2A6E (Temperature)
#define BT_UUID_TEMPERATURE_CHAR_VAL \
	BT_UUID_128_ENCODE(0x00002a6e, 0x0000, 0x1000, 0x8000, 0x00805f9b34fb)

// UUID Humidité: 0x2A6F (Humidity)
#define BT_UUID_HUMIDITY_CHAR_VAL \
	BT_UUID_128_ENCODE(0x00002a6f, 0x0000, 0x1000, 0x8000, 0x00805f9b34fb)

// UUID Pression: 0x2A6D (Pressure)
#define BT_UUID_PRESSURE_CHAR_VAL \
	BT_UUID_128_ENCODE(0x00002a6d, 0x0000, 0x1000, 0x8000, 0x00805f9b34fb)

// Initialiser le service BME280
int bme280_service_init(void);

// Mettre à jour la température (en centièmes de degrés Celsius)
void bme280_update_temperature(int16_t temp);

// Mettre à jour l'humidité (en centièmes de %)
void bme280_update_humidity(uint16_t humidity);

// Mettre à jour la pression (en Pascals)
void bme280_update_pressure(uint32_t pressure);

#ifdef __cplusplus
}
#endif

#endif /* BME280_SERVICE_H_ */
