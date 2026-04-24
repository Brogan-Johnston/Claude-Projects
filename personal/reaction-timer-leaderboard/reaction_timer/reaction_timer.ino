#include <LiquidCrystal.h>

// RS, E, D4, D5, D6, D7
LiquidCrystal lcd(A1, A2, A3, A4, A5, A0);

int whiteLED1 = 12;
int greenLED  = 11;
int yellowLED = 10;
int redLED    = 9;
int whiteLED2 = 8;

int buzzer  = 7;
int button1 = 13;
int button2 = 6;

bool          buttonPressed = 0;
unsigned long goTime        = 0;
unsigned long reactionTime  = 0;
int           winner        = 0;

// Scoreboard
int score1 = 0;
int score2 = 0;

void setup() {
  pinMode(whiteLED1, OUTPUT);
  pinMode(greenLED,  OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(redLED,    OUTPUT);
  pinMode(whiteLED2, OUTPUT);
  pinMode(buzzer,    OUTPUT);
  pinMode(button1,   INPUT_PULLUP);
  pinMode(button2,   INPUT_PULLUP);

  randomSeed(analogRead(A1));

  Serial.begin(9600); // <-- ADDED: enables leaderboard app communication

  lcd.begin(16, 2);
  lcd.print("Reaction Timer!");
  lcd.setCursor(0, 1);
  lcd.print("Get Ready...");
  delay(1500);
}

void loop() {

  // Show scoreboard before each round
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("P1:"); lcd.print(score1);
  lcd.setCursor(8, 0); lcd.print("P2:"); lcd.print(score2);
  lcd.setCursor(0, 1); lcd.print("Starting soon...");
  delay(2000);

  // --- 3 (green) ---
  lcd.clear();
  lcd.setCursor(5, 0); lcd.print("3");
  lcd.setCursor(0, 1); lcd.print("P1:");
  lcd.setCursor(8, 1); lcd.print("P2:");
  lcd.setCursor(3, 1); lcd.print(score1);
  lcd.setCursor(11, 1); lcd.print(score2);
  digitalWrite(greenLED, HIGH);
  digitalWrite(buzzer, HIGH); delay(100); digitalWrite(buzzer, LOW);
  delay(900);
  digitalWrite(greenLED, LOW);

  // --- 2 (yellow) ---
  lcd.clear();
  lcd.setCursor(5, 0); lcd.print("2");
  lcd.setCursor(0, 1); lcd.print("P1:");
  lcd.setCursor(8, 1); lcd.print("P2:");
  lcd.setCursor(3, 1); lcd.print(score1);
  lcd.setCursor(11, 1); lcd.print(score2);
  digitalWrite(yellowLED, HIGH);
  digitalWrite(buzzer, HIGH); delay(100); digitalWrite(buzzer, LOW);
  delay(900);
  digitalWrite(yellowLED, LOW);

  // --- 1 (red) ---
  lcd.clear();
  lcd.setCursor(5, 0); lcd.print("1");
  lcd.setCursor(0, 1); lcd.print("P1:");
  lcd.setCursor(8, 1); lcd.print("P2:");
  lcd.setCursor(3, 1); lcd.print(score1);
  lcd.setCursor(11, 1); lcd.print(score2);
  digitalWrite(redLED, HIGH);
  digitalWrite(buzzer, HIGH); delay(100); digitalWrite(buzzer, LOW);
  delay(random(900, 4901));
  digitalWrite(redLED, LOW);

  // --- GO! ---
  lcd.clear();
  lcd.setCursor(5, 0); lcd.print("GO!!!");
  lcd.setCursor(0, 1); lcd.print(" 0.0000s");
  digitalWrite(whiteLED1, HIGH);
  digitalWrite(whiteLED2, HIGH);
  goTime = millis();

  while (buttonPressed == 0) {
    unsigned long elapsed = millis() - goTime;

    unsigned long whole   = elapsed / 1000;
    unsigned long decimal = elapsed % 1000;

    lcd.setCursor(2, 1);
    lcd.print(whole);
    lcd.print(".");
    if      (decimal <   10) lcd.print("000");
    else if (decimal <  100) lcd.print("00");
    else if (decimal < 1000) lcd.print("0");
    lcd.print(decimal);
    lcd.print("0s ");

    if (digitalRead(button1) == 0) {
      buttonPressed = 1;
      winner = 1;
      digitalWrite(whiteLED2, LOW);
    } else if (digitalRead(button2) == 0) {
      buttonPressed = 1;
      winner = 2;
      digitalWrite(whiteLED1, LOW);
    }
  }

  reactionTime = millis() - goTime;

  // Send result to leaderboard app over USB serial  <-- ADDED
  Serial.print("RESULT:");
  Serial.print(winner);
  Serial.print(":");
  Serial.println(reactionTime);

  // Update score
  if (winner == 1) score1++;
  if (winner == 2) score2++;

  // Format final time
  unsigned long whole   = reactionTime / 1000;
  unsigned long decimal = reactionTime % 1000;

  // --- Result screen ---
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("P"); lcd.print(winner); lcd.print(" wins! ");
  lcd.print(whole); lcd.print(".");
  if      (decimal <   10) lcd.print("000");
  else if (decimal <  100) lcd.print("00");
  else if (decimal < 1000) lcd.print("0");
  lcd.print(decimal);
  lcd.print("0s");

  lcd.setCursor(0, 1);
  if      (reactionTime < 200) lcd.print("Incredible!!");
  else if (reactionTime < 300) lcd.print("Lightning fast!");
  else if (reactionTime < 400) lcd.print("Great!");
  else if (reactionTime < 500) lcd.print("Good!");
  else                         lcd.print("Keep practicing!");

  digitalWrite(buzzer, HIGH); delay(500); digitalWrite(buzzer, LOW);
  delay(3000);

  digitalWrite(whiteLED1, LOW);
  digitalWrite(whiteLED2, LOW);
  buttonPressed = 0;
  winner        = 0;
}
