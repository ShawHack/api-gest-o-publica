# 📡 Manual de Integração — Rede Municipal de Estações IoT (FATEC / SEMIT Garça)

**Destinatário:** Equipe FATEC Garça (Professores e Alunos)  
**Projeto:** Rede de Telemetria e Monitoramento Climático Municipal (10 Pontos de Aferição)  
**Órgão:** SEMIT — Secretaria Municipal de Inovação e Tecnologia de Garça  
**Data:** 23/09/2026  

---

## 1. 📍 Tabela dos 10 Pontos de Aferição & Credenciais MQTT

O projeto municipal contempla **10 pontos de aferição**, sendo o **Ponto 01 o Lago Municipal**. Cada estação possui um usuário e senha exclusivos com permissão restrita para o seu respectivo tópico:

| Ponto | Local de Instalação | Usuário (`username`) | Tópico MQTT Autorizado (`telemetry`) | Senha de Acesso (`password`) |
| :--- | :--- | :--- | :--- | :--- |
| **01 (Principal)** | **Lago Municipal (Prof. J. K. Williams)** | `station-weather-01` | `municipio/v1/garca/weather-station/station-weather-01/telemetry` | `2078974081789a888388691feedb567911550fe4b3d11676dfa62d7fc5a6caf0` |
| **02** | **Bosque Municipal (Dr. Belírio Guimarães)** | `station-weather-02` | `municipio/v1/garca/weather-station/station-weather-02/telemetry` | `707cd630f11e37fadf920f9fd7957590` |
| **03** | **FATEC Garça (Campus Universitário)** | `station-weather-03` | `municipio/v1/garca/weather-station/station-weather-03/telemetry` | `f96b7535e6a1c013d631b1d5c4050469` |
| **04** | **Paço Municipal / Centro Cívico** | `station-weather-04` | `municipio/v1/garca/weather-station/station-weather-04/telemetry` | `3b8586f66c02a9b8b83ffc011c1a9941` |
| **05** | **Distrito Industrial** | `station-weather-05` | `municipio/v1/garca/weather-station/station-weather-05/telemetry` | `eee71ffe40f82e41aef9126406bb574d` |
| **06** | **Região Norte (Jardim Williams)** | `station-weather-06` | `municipio/v1/garca/weather-station/station-weather-06/telemetry` | `dd3ffd1733fc9ca8ba327b3a7d66a233` |
| **07** | **Região Leste (Labienópolis)** | `station-weather-07` | `municipio/v1/garca/weather-station/station-weather-07/telemetry` | `98f00df24ea5f06bb5640555b13b2ed2` |
| **08** | **Região Sul (Cascata / Ecoparque)** | `station-weather-08` | `municipio/v1/garca/weather-station/station-weather-08/telemetry` | `6264f7b66f5f9c2a9674e6dd03ae6b2d` |
| **09** | **Zona Rural / Horto Florestal** | `station-weather-09` | `municipio/v1/garca/weather-station/station-weather-09/telemetry` | `15906baa38dc2e3bf6070c94d745a9b9` |
| **10** | **Defesa Civil / Base SEMIT** | `station-weather-10` | `municipio/v1/garca/weather-station/station-weather-10/telemetry` | `6b666e652acfa2d9b5e7956bcdb19f74` |

---

## 2. 🌐 Parâmetros Gerais do Broker MQTT

* **Host / Servidor:** `10.15.25.28` *(Rede Interna/VPN)* ou `api.garca.sp.gov.br` *(Internet)*
* **Porta:** `8883` (**MQTTS** — Seguro via TLS 1.2)
* **QoS:** `1` (Entrega garantida)
* **Keep-Alive:** `60` segundos
* **Frequência de Envio:** **300 segundos** (5 minutos)

---

## 3. 📦 Formato do Payload (JSON UTF-8)

O microcontrolador de cada estação deve publicar o payload no formato abaixo:

```json
{
  "schemaVersion": 1,
  "messageId": "est01-20260923-143000",
  "observedAt": "2026-09-23T14:30:00-03:00",
  "metrics": {
    "temperature": { "value": 24.5, "unit": "Cel" },
    "relativeHumidity": { "value": 62.0, "unit": "%" },
    "windSpeed": { "value": 3.4, "unit": "m/s" },
    "windDirection": { "value": 220, "unit": "deg" },
    "rainAccumulated": { "value": 0.0, "unit": "mm" },
    "atmosphericPressure": { "value": 1013.25, "unit": "hPa" }
  },
  "diagnostics": {
    "battery": 95,
    "signal": -65
  }
}
```

> **Dica de Preenchimento:**
> * `messageId`: Identificador único da mensagem (utilizado para evitar gravações duplicadas).
> * `observedAt`: Data e hora em formato ISO 8601 (com fuso horário `-03:00`).
> * Envie somente os sensores disponíveis no hardware; métricas ausentes são tratadas de forma transparente.

---

## 4. 🔒 Certificado Raiz TLS (`SEMIT IoT CA`)

Para microcontroladores com validação de certificado (ex: ESP32 com `WiFiClientSecure`):

```text
-----BEGIN CERTIFICATE-----
MIIFvTCCA6WgAwIBAgIUQMl7DwulJhFZ+pQWfn8MIy2mEkkwDQYJKoZIhvcNAQEL
BQAwbjELMAkGA1UEBhMCQlIxCzAJBgNVBAgMAlNQMQ4wDAYDVQQHDAVHYXJjYTEb
MBkGA1UECgwSTXVuaWNpcGlvIGRlIEdhcmNhMQ4wDAYDVQQLDAVTRU1JVDEVMBMG
A1UEAwwMU0VNSVQgSW9UIENBMB4XDTI2MDkyMzE2MDc1NFoXDTM2MDkyMDE2MDc1
NFowbjELMAkGA1UEBhMCQlIxCzAJBgNVBAgMAlNQMQ4wDAYDVQQHDAVHYXJjYTEb
MBkGA1UECgwSTXVuaWNpcGlvIGRlIEdhcmNhMQ4wDAYDVQQLDAVTRU1JVDEVMBMG
A1UEAwwMU0VNSVQgSW9UIENBMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKC
AgEAjM2Sxb44kAETQaaPQyR7n454Fd18KD48dwItFCvqoRLF/riX0ZA1iP1LnIBi
UKA+hiZ2Qxuv2BPydfT/3UVA/TYuhVhJiDrFzZe21GuLR+Q734Wkk4qZ7+aPPx/u
CP/3u8dxNA2nOLepuPZnqrKPgVIFQ84nC79Ye/4gMr/JKe4kcuHrSb7W3F9Jhf+L
9hAOBaqOPOFIq1yVofCHEf0b/jlePHtZt8uIDLYEehxA9NqdxOuBITbvYDHe1vQ1
0WvCb2u55DHMIJtzOGaEN8Tabkf+fWjVUdQBTURfrGGQSVg17X9DMadOolHtC/kq
gq4dPNhkz72IQpv5HGiMf+ajvugXn1V5lsd8VH79Ewr5acBvqEm6etZ/xbgW28BB
MlD97mPTuN1A3SJ+nMFLcBSw0AWOTBlH9jOrDd2FCCjkZJ95Ny0lvsUk40cN3/ti
UU6zpEjbhWyFH2FPjRlIB4NhEO75arzrjwwx37Djs6gHyYUnEoA/gc1gjQ91LeXQ
EyC/zUu7mRVhAUOZwZKuzrOJxqLZUyYnqti+r24v9ZOWq9PPUswkbqu9LE6uVgEn
BcaBFtBYHgNX8HVcHqtzbaxWwa3+C+i5LiNataCzmDg/y2SxYd/PxkWbf9sfpXOl
zXMnc+65fbnfEEurosE2Qn335QICQeRZOkfaYkW33nSsbIECAwEAAaNTMFEwHQYD
VR0OBBYEFOUypStuyqkiarFT+wi0FTtqvx3aMB8GA1UdIwQYMBaAFOUypStuyqki
arFT+wi0FTtqvx3aMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggIB
AHlwjdk5QJAIOVPu2SkrJF5Gnc4QUCPVh6qpiTfR8QXe70IcMErBWgqXed49pNud
TmReFPl9SR4/v6iYhCByTYwzcKIu23BdHkIqLWwAtSbBiGvJn4K0PZEiUToHP63T
1pBciMcsjixucaWLE8/s1jIQX07tdiyahvLQHFpdS4lxnk6uFA8JGp+aDB43UO2X
eSFS62q2zpg5MMo746Po0DIDbyRPkRTbSrlHuUX+uj8M45+zFP1pQF2t3+b+nhRO
uzgjNG5ekFn99StCWtZkoxW/fVGQumwVZqOWhh3Eh2xJWLKgJ5B1e3IojIANNIpR
4otFtKsM0MyHQhqEbeDVHpn07eU9sHkHQLf5J38UqbHZnaWl3MN4GTxgNJbGpBm1
dy39qPqiitlg6d+LEFQ54gmOetmPAUU/bn28hDpbelrQZRIBiP9WGCiPgAwfSQ7/
i6AQseomIrZuDu3UEh0wjLEWZaQrj1q/kZJ8+OfhQpfdm611RzUVKB6Gg2kZqALK
U7BZUI88FOMD8dwQoH4tFHlJhlxfc+hDxsldZQLhRn0jLbn7+F1VdE8kGKAipRm0
7FmNoeiefLZcAYGgs/J3mF59o7Cm6ehLnSFmXT/yGC/qRhAABbCjlJMCcR7wK3rW
WylPfKWSR0i+16RNlXp1OSs5+zQ4IfUGyQ5DR50xpyEo
-----END CERTIFICATE-----
```

*(Obs: Nos primeiros testes de bancada no ESP32, pode-se utilizar `espClient.setInsecure()` antes de fixar o certificado definitivo).*

---

## 5. 💻 Exemplo em C++ / Arduino para ESP32

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "SEU_WIFI";
const char* password = "SUA_SENHA_WIFI";

const char* mqtt_server = "10.15.25.28"; // ou api.garca.sp.gov.br
const int mqtt_port = 8883;

// Configure conforme a estação que está instalando (ex: Ponto 01 - Lago Municipal):
const char* mqtt_user = "station-weather-01";
const char* mqtt_pass = "2078974081789a888388691feedb567911550fe4b3d11676dfa62d7fc5a6caf0";
const char* mqtt_topic = "municipio/v1/garca/weather-station/station-weather-01/telemetry";

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  
  espClient.setInsecure(); // Para testes de conexão rápida
  client.setServer(mqtt_server, mqtt_port);
}

void sendTelemetry(float temp, float hum, float wind) {
  if (!client.connected()) {
    while (!client.connect(mqtt_user, mqtt_user, mqtt_pass)) {
      delay(1000);
    }
  }

  StaticJsonDocument<512> doc;
  doc["schemaVersion"] = 1;
  doc["messageId"] = String(mqtt_user) + "-" + String(millis());
  doc["observedAt"] = "2026-09-23T14:30:00-03:00"; // Data com fuso

  JsonObject metrics = doc.createNestedObject("metrics");
  JsonObject t = metrics.createNestedObject("temperature");
  t["value"] = temp;
  t["unit"] = "Cel";

  JsonObject h = metrics.createNestedObject("relativeHumidity");
  h["value"] = hum;
  h["unit"] = "%";

  JsonObject w = metrics.createNestedObject("windSpeed");
  w["value"] = wind;
  w["unit"] = "m/s";

  char buffer[512];
  serializeJson(doc, buffer);
  client.publish(mqtt_topic, buffer, 1);
  Serial.println("Telemetria enviada com sucesso!");
}

void loop() {
  client.loop();
  static unsigned long lastMsg = 0;
  if (millis() - lastMsg > 300000) { // Envio a cada 5 minutos
    lastMsg = millis();
    sendTelemetry(24.5, 62.0, 3.4);
  }
}
```

---

## 6. 📊 Painéis de Monitoramento

Os dados transmitidos de cada um dos 10 pontos de aferição caem automaticamente no portal e no banco de dados municipal:

* 🖥️ **Portal SEMIT IoT:** [https://api.garca.sp.gov.br/iot/](https://api.garca.sp.gov.br/iot/)
* 📊 **Grafana Operacional:** [https://api.garca.sp.gov.br:3001](https://api.garca.sp.gov.br:3001)

---
*SEMIT — Secretaria Municipal de Inovação e Tecnologia • Prefeitura de Garça*
