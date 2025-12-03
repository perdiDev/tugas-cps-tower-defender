/*
  AA Turret Controller
  
  Inputs:
  - Potentiometer (A0): Controls Pitch (Up/Down)
  - Button Left (D2): Rotates Turret Left
  - Button Right (D3): Rotates Turret Right
  - Button Fire (D4): Fires Cannon
  
  Output:
  - Serial string: "pitch,left,right,fire"
  - Example: "512,0,0,1"
*/

const int PIN_POT = A0;
const int PIN_POT2 = A1;
const int PIN_BTN_FIRE = 2;

void setup() {
  Serial.begin(9600);
  
  // Configure button pins with internal pull-up resistors
  // Buttons should connect to GND when pressed
  pinMode(PIN_BTN_FIRE, INPUT_PULLUP);
}

void loop() {
  // Read Potentiometer (0-1023)
  int potValue = analogRead(PIN_POT);
  int potValue2 = analogRead(PIN_POT2);

  // Read Fire Button
  int fireState = !digitalRead(PIN_BTN_FIRE);
  
  // Send data as comma-separated string
  // Format: potPitch,potYaw,fire
  Serial.print(potValue);
  Serial.print(",");
  Serial.print(potValue2);
  Serial.print(",");
  Serial.println(fireState);
  
  // Small delay to prevent flooding serial buffer
  delay(50);
}
