# nRF52833 + BME280 - Code Source

## 📌 Description
Code Zephyr RTOS pour intégrer le capteur BME280 (température, humidité, pression) avec service BLE.

## 🔌 Câblage BME280

```
nRF52833 DK          BME280
-------------        ------------------
VDD (3.3V)      -->  VCC
GND             -->  GND
P0.26           -->  SCL
P0.27           -->  SDA
```

**Note**: L'adresse I2C du BME280 peut être 0x76 ou 0x77 selon le module. Par défaut, le code utilise 0x76.

## 📁 Structure des fichiers

```
src/
├── main.c                  # Programme principal
├── my_lbs.c/h             # Service LED/Button (original)
├── bme280_service.c/h     # Service BLE pour BME280
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

### Service BME280 (UUID: 0x181A - Environmental Sensing)

- **Température** (UUID: 0x2A6E)
  - Format: 2 bytes (int16 little-endian)
  - Valeur en centièmes de °C (ex: 2350 = 23.50°C)
  - Notification activée (mise à jour toutes les 2 secondes)

- **Humidité** (UUID: 0x2A6F)
  - Format: 2 bytes (uint16 little-endian)
  - Valeur en centièmes de % (ex: 6543 = 65.43%)
  - Notification activée (mise à jour toutes les 2 secondes)

- **Pression** (UUID: 0x2A6D)
  - Format: 4 bytes (uint32 little-endian)
  - Valeur en Pascals (ex: 101325 Pa = 1013.25 hPa)
  - Notification activée (mise à jour toutes les 2 secondes)

### Service LED/Button (original)
- LED control (Write)
- Button state (Read)

## 🔧 Configuration I2C
- **Bus**: I2C0
- **Adresse BME280**: 0x76 (peut être 0x77)
- **Fréquence**: 100 kHz (Standard)
- **SCL**: P0.26
- **SDA**: P0.27

## 📊 Conversion des données

### Température
- Format BLE: centièmes de °C
- Conversion: `temp_celsius = value / 100.0`
- Exemple: 2350 → 23.50°C

### Humidité
- Format BLE: centièmes de %
- Conversion: `humidity_percent = value / 100.0`
- Exemple: 6543 → 65.43%

### Pression
- Format BLE: Pascals
- Conversion en hPa: `pressure_hpa = value / 100.0`
- Conversion en mmHg: `pressure_mmhg = value / 133.322`
- Exemple: 101325 Pa → 1013.25 hPa → 760 mmHg

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
[INF] BME280 detected (chip ID: 0x60)
[INF] BME280 initialized successfully
[INF] Temp: 23.45°C | Humidity: 65.43% | Pressure: 101325 Pa
```

## ⚠️ Dépannage

### Erreur "Invalid chip ID"
- Vérifier le câblage (VCC, GND, SCL, SDA)
- Tester l'adresse I2C alternative (changer 0x76 en 0x77 dans main.c ligne 42)
- Vérifier que le capteur est bien un BME280 (pas BMP280)

### Pas de données BLE
- Vérifier que le device est bien connecté
- Activer les notifications sur les caractéristiques
- Vérifier les logs série

### Données incohérentes
- Vérifier l'alimentation 3.3V stable
- Laisser le capteur se stabiliser 5-10 secondes après démarrage
- Vérifier que les câbles I2C ne sont pas trop longs (< 30cm recommandé)

### Différence d'adresse I2C
Si le capteur n'est pas détecté avec 0x76:
1. Modifier `BME280_ADDR` dans main.c ligne 42 → `0x77`
2. Recompiler et flasher

## 📱 Connexion depuis l'app React

L'app détectera automatiquement le service BME280 et affichera:
- 🌡️ **Température** en °C avec 2 décimales
- 💧 **Humidité** en % avec 2 décimales
- 🔽 **Pression** en hPa avec 2 décimales

Les données sont décodées automatiquement et affichées en temps réel avec des graphiques.

## 📈 Plages de mesure BME280

- **Température**: -40°C à +85°C (±1°C de précision)
- **Humidité**: 0% à 100% (±3% de précision)
- **Pression**: 300 hPa à 1100 hPa (±1 hPa de précision)

## 🔋 Consommation typique
- Mode normal: ~3.6 µA @ 1 Hz
- Mode sleep: 0.1 µA
