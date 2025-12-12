Voici un README propre, clair et pro, parfait pour ton dépôt GitHub 👇
(Je l’ai rédigé comme un vrai projet hardware + firmware autour du NINA-B416.)

⸻

📡 BeaconBlock — Mini carte d’extension NINA-B416 (LEDs + Boutons + UART)

Ce projet consiste en la création d’une petite carte électronique basée sur le module u-blox NINA-B416, comprenant :
	•	Deux LEDs avec résistances
	•	Deux boutons poussoirs
	•	Une interface UART (RX/TX) pour programmation / debug
	•	Un connecteur 1×6 (3.3V / GND / RX / TX / DTR / CTS)
	•	Les condensateurs de découplage 100 nF + 4.7 µF
	•	Une topologie propre avec plan de masse et routing optimisé

Cette carte est idéale comme module de test / dev board minimaliste pour découvrir le NINA-B416 ou développer un firmware BLE / UART / GPIO.

⸻

🧩 Contenu du projet

Le dépôt contient :

/schematic/          → Schéma KiCad
/pcb/                → Routage PCB
/gerbers/            → Fichiers de fabrication
/3d/                 → Rendu 3D (si disponible)
/README.md           → Ce fichier


⸻

🔌 Fonctionnalités principales

✔️ 1. Module NINA-B416 (nRF52840)
	•	Alimentation en 3.3V
	•	Condensateurs de découplage positionnés au plus proche :
	•	C1 → 100 nF
	•	C2 → 4.7 µF
	•	Broches utiles exposées : GPIO, UART, SWD, GND, VCC

✔️ 2. Interface UART

Connecteur 1×6 avec signalisation standard :

Pin	Fonction
1	DTR
2	RX
3	TX
4	VCC 3.3V
5	CTS
6	GND

Permet :
	•	Programmation
	•	Debug
	•	Logs série

✔️ 3. Boutons poussoirs
	•	SW1 → GPIO du NINA (IO_25)
	•	SW2 → GPIO du NINA (IO_24)
	•	Pull-down 10 kΩ inclus (R3, R4)

✔️ 4. LEDs
	•	LED1 → GPIO (LED_RED)
	•	LED2 → GPIO (LED_BLUE)
	•	Résistances de 1 kΩ (R1, R2)

⸻

🛠️ Matériel utilisé
	•	u-blox NINA-B416 (nRF52840)
	•	Condo 100 nF X7R
	•	Condo 4.7 µF
	•	Résistances 1 kΩ et 10 kΩ
	•	LED SMD 0603
	•	Boutons SMD (tact switch)
	•	Connecteur 1×6 2.54mm

⸻

⚡ Alimentation

La carte fonctionne uniquement en 3.3V.

⚠️ Attention : NE PAS alimenter le NINA en 5V !
Le module n’a pas de régulateur intégré.

⸻

📐 Routage PCB

Points clés du design :
	•	Condensateurs de découplage au plus proche des broches VCC du NINA
	•	Pistes RX/TX courtes, et côte-à-côte (pas besoin de différentiel)
	•	Plan de masse complet sur la face principale
	•	LED + résistances proches du module
	•	Boutons avec retour GND propre
	•	Via stitching recommandé autour du module (pour blindage)

⸻

🧪 Code firmware (exemple)

Un petit test pour vérifier que tout fonctionne :

void setup() {
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);

  pinMode(SW1_PIN, INPUT);
  pinMode(SW2_PIN, INPUT);

  Serial.begin(115200);
}

void loop() {
  digitalWrite(LED1_PIN, digitalRead(SW1_PIN));
  digitalWrite(LED2_PIN, digitalRead(SW2_PIN));

  if (Serial.available()) {
    Serial.println("UART OK");
  }
}


⸻

🏭 Fabrication

Le PCB peut être fabriqué chez n’importe quel fournisseur :
	•	JLCPCB
	•	PCBWay
	•	Aisler
	•	Eurocircuits
etc.

Paramètres recommandés :
	•	Épaisseur : 1.6 mm
	•	Couleur : libre
	•	Cuivre : 1 oz
	•	Masque : standard
	•	Finition : HASL ou ENIG

⸻

📦 Assemblage

Gestion des composants :
	•	LED → attention à l’orientation
	•	Boutons → pads symétriques, easy
	•	NINA-B416 → nécessite reflow (hot air ou four), pas soudable au fer
	•	Vérifier l’exposed pad GND

⸻

🚀 Statut du projet

✔ Schéma terminé
✔ PCB routé
✔ Vérification électrique OK
⬜ Test électrique
⬜ Test firmware

