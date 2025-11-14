#
# CMakeLists.txt modifié pour inclure le service MPU6050
#
cmake_minimum_required(VERSION 3.20.0)

find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(nrf_mpu6050)

# Sources du projet
target_sources(app PRIVATE
  src/main.c
  src/my_lbs.c
  src/mpu6050_service.c
)

# Inclure le répertoire pour les headers
zephyr_library_include_directories(.)
