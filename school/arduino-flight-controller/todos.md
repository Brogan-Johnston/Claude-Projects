# Arduino Flight Controller — Task Tracking

## Setup Tasks
- [x] Create project directory structure
- [x] Write CLAUDE.md with wiring and run instructions
- [x] Write Arduino firmware (flight_controller.ino)
- [x] Write Python serial reader (serial_reader.py)
- [x] Write vJoy output module (vjoy_output.py)
- [x] Write configuration manager (config_manager.py)
- [x] Write GUI app (main.py)
- [x] Write requirements.txt and default_config.json

## Hardware Setup (Manual)
- [ ] Wire joystick module to A0, A1, D2
- [ ] Wire potentiometer (throttle) to A2
- [ ] Wire SG90 servo to D9
- [ ] Upload firmware via Arduino IDE
- [ ] Install vJoy driver and configure Device 1

## Software Setup (Manual)
- [ ] Install Python 3 and add to PATH
- [ ] Run: pip install -r app/requirements.txt
- [ ] Run: python app/main.py
- [ ] Verify live input display responds to physical inputs
- [ ] Configure flight sim to use vJoy Device 1

## Future Improvements
- [ ] Add button debounce in firmware
- [ ] Add axis calibration wizard (sweep min/max automatically)
- [ ] Add profile save/load (multiple game presets)
- [ ] Add second button (e.g. D3 for weapons release)
