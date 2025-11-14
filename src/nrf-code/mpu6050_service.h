/*
 * MPU6050 Sensor Service
 * Service BLE pour exposer les données du gyroscope/accéléromètre
 */

#ifndef MPU6050_SERVICE_H_
#define MPU6050_SERVICE_H_

#ifdef __cplusplus
extern "C" {
#endif

#include <zephyr/types.h>

// UUID du service MPU6050 (Environmental Sensing Service standard)
#define BT_UUID_MPU6050_SERVICE_VAL BT_UUID_128_ENCODE(0x0000181a, 0x0000, 0x1000, 0x8000, 0x00805f9b34fb)

// UUIDs des caractéristiques (Motion Sensor standards)
#define BT_UUID_MPU6050_ACCEL_VAL BT_UUID_128_ENCODE(0x00002a58, 0x0000, 0x1000, 0x8000, 0x00805f9b34fb)
#define BT_UUID_MPU6050_GYRO_VAL BT_UUID_128_ENCODE(0x00002a59, 0x0000, 0x1000, 0x8000, 0x00805f9b34fb)

#define BT_UUID_MPU6050_SERVICE BT_UUID_DECLARE_128(BT_UUID_MPU6050_SERVICE_VAL)
#define BT_UUID_MPU6050_ACCEL BT_UUID_DECLARE_128(BT_UUID_MPU6050_ACCEL_VAL)
#define BT_UUID_MPU6050_GYRO BT_UUID_DECLARE_128(BT_UUID_MPU6050_GYRO_VAL)

// Structure pour les données du capteur (3 axes en int16)
struct sensor_data {
	int16_t x;
	int16_t y;
	int16_t z;
};

/** @brief Initialiser le service BLE MPU6050
 *
 * @retval 0 Si succès
 *         Sinon, un code d'erreur négatif
 */
int mpu6050_service_init(void);

/** @brief Mettre à jour les données de l'accéléromètre
 *
 * @param[in] accel_data Pointeur vers les données d'accélération
 *
 * @retval 0 Si succès
 */
int mpu6050_update_accel(const struct sensor_data *accel_data);

/** @brief Mettre à jour les données du gyroscope
 *
 * @param[in] gyro_data Pointeur vers les données du gyroscope
 *
 * @retval 0 Si succès
 */
int mpu6050_update_gyro(const struct sensor_data *gyro_data);

#ifdef __cplusplus
}
#endif

#endif /* MPU6050_SERVICE_H_ */
