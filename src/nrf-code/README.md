# nRF52833 + MPU6050 (GY-6180) - Code Source

## 📌 Description
Code Zephyr RTOS pour intégrer le capteur MPU6050 (accéléromètre + gyroscope) avec service BLE.

## 🔌 Câblage MPU6050

```
nRF52833 DK          MPU6050 (GY-6180)
-------------        ------------------
VDD (3.3V)      -->  VCC
GND             -->  GND
P0.26           -->  SCL
P0.27           -->  SDA
```

## 📁 Structure des fichiers

```
src/
├── main.c                  # Programme principal
├── my_lbs.c/h             # Service LED/Button (original)
├── mpu6050_service.c/h    # Nouveau service BLE pour MPU6050
├── CMakeLists.txt         # Configuration build
├── prj.conf               # Configuration Zephyr
├── nrf52833dk_nrf52833.overlay  # Configuration I2C
├── Kconfig.sysbuild       # Configuration sysbuild
└── sample.yaml            # Configuration test
```

## 🚀 Compilation et Flash

### 1. Ouvrir le projet dans VS Code avec nRF Connect Extension

### 2. Créer une nouvelle build configuration
```bash
west build -b nrf52833dk/nrf52833
```

### 3. Flasher sur la carte
```bash
west flash
```

## 📡 Services BLE exposés

### Service MPU6050 (UUID: 0x181A)
- **Accéléromètre** (UUID: 0x2A58)
  - Format: 6 bytes (3x int16 big-endian)
  - X, Y, Z en unités brutes (-32768 à +32767)
  - Notification activée (mise à jour toutes les 500ms)

- **Gyroscope** (UUID: 0x2A59)
  - Format: 6 bytes (3x int16 big-endian)
  - X, Y, Z en unités brutes
  - Notification activée (mise à jour toutes les 500ms)

### Service LED/Button (original)
- LED control (Write)
- Button state (Read)

## 🔧 Configuration I2C
- **Bus**: I2C0
- **Adresse MPU6050**: 0x68
- **Fréquence**: 100 kHz (Standard)
- **SCL**: P0.26
- **SDA**: P0.27

## 📊 Conversion des données brutes

### Accéléromètre
- Plage par défaut: ±2g
- Sensibilité: 16384 LSB/g
- Formule: `accel_g = raw_value / 16384.0`

### Gyroscope
- Plage par défaut: ±250°/s
- Sensibilité: 131 LSB/°/s
- Formule: `gyro_dps = raw_value / 131.0`

## 🐛 Debug

### Logs série (115200 baud)
```bash
# Sur Linux/Mac
screen /dev/ttyACM0 115200

# Ou avec minicom
minicom -D /dev/ttyACM0 -b 115200
```

### Vérifier la connexion I2C
Les logs devraient afficher:
```
[INF] I2C device ready
[INF] MPU6050 initialized successfully
[DBG] Accel: X=... Y=... Z=... | Gyro: X=... Y=... Z=...
```

## ⚠️ Dépannage

### Erreur "I2C device not ready"
- Vérifier le câblage (VCC, GND, SCL, SDA)
- Vérifier que le overlay est bien présent
- Tester l'adresse I2C (0x68 ou 0x69 si AD0 est à VCC)

### Pas de données BLE
- Vérifier que le device est bien connecté
- Activer les notifications sur les caractéristiques
- Vérifier les logs série

### Données incohérentes
- Calibrer le capteur (mettre à plat pendant l'initialisation)
- Vérifier l'alimentation 3.3V stable
- Réduire la fréquence de lecture si nécessaire

## 📱 Connexion depuis l'app React

L'app détectera automatiquement le service MPU6050 et affichera:
- 🌡️ Température (si implémentée)
- 💧 Humidité (si implémentée)  
- 📐 Accéléromètre avec valeurs X/Y/Z
- 🔄 Gyroscope avec valeurs X/Y/Z

Les données sont décodées automatiquement et affichées en temps réel.
