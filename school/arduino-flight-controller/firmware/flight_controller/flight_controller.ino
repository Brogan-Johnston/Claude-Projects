/*
 * flight_controller.ino
 * Arduino UNO R3 — Flight Stick & Throttle Controller
 *
 * Reads joystick X/Y axes, joystick button, and a potentiometer
 * for throttle. Moves an SG90 servo to mirror the throttle position.
 * Sends CSV data over USB serial at 50 Hz for the PC app to consume.
 *
 * Serial output format (115200 baud):
 *   X,Y,BTN,THROTTLE\n
 *   X, Y:      0–1023  (joystick analog, center ≈ 512)
 *   BTN:       0 or 1  (1 = pressed)
 *   THROTTLE:  0–1023  (potentiometer)
 *
 * Wiring:
 *   Joystick VRx  → A0
 *   Joystick VRy  → A1
 *   Joystick SW   → D2  (active LOW, uses INPUT_PULLUP)
 *   Throttle pot  → A2
 *   Servo signal  → D9  (PWM)
 *   All VCC       → 5V
 *   All GND       → GND
 */

#include <Servo.h>

// ── Pin definitions ────────────────────────────────────────────────────
const int JOY_X_PIN    = A0;
const int JOY_Y_PIN    = A1;
const int JOY_BTN_PIN  = 2;
const int THROTTLE_PIN = A2;
const int SERVO_PIN    = 9;

// ── Timing ────────────────────────────────────────────────────────────
// 50 Hz output (one packet every 20 ms)
const unsigned long SEND_INTERVAL_MS = 20;
unsigned long lastSendTime = 0;

// ── Servo ─────────────────────────────────────────────────────────────
Servo throttleServo;

// ── Setup ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Joystick button uses internal pull-up; pin reads LOW when pressed
  pinMode(JOY_BTN_PIN, INPUT_PULLUP);

  throttleServo.attach(SERVO_PIN);

  // Move servo to center on startup
  throttleServo.write(90);
}

// ── Main loop ─────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    // Read inputs
    int joyX     = analogRead(JOY_X_PIN);
    int joyY     = analogRead(JOY_Y_PIN);
    int button   = (digitalRead(JOY_BTN_PIN) == LOW) ? 1 : 0;
    int throttle = analogRead(THROTTLE_PIN);

    // Mirror throttle position on the servo (0–1023 → 0–180 degrees)
    int servoAngle = map(throttle, 0, 1023, 0, 180);
    throttleServo.write(servoAngle);

    // Send CSV line: X,Y,BTN,THROTTLE
    Serial.print(joyX);
    Serial.print(',');
    Serial.print(joyY);
    Serial.print(',');
    Serial.print(button);
    Serial.print(',');
    Serial.println(throttle);
  }
}
