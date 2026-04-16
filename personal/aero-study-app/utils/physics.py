# Shared physical constants and utility functions

import numpy as np

# Standard atmosphere (sea level)
RHO_SL = 1.225       # kg/m^3, air density
P_SL = 101325.0      # Pa, pressure
T_SL = 288.15        # K, temperature
GAMMA = 1.4          # ratio of specific heats (air)
R_AIR = 287.058      # J/(kg·K), specific gas constant
A_SL = 340.29        # m/s, speed of sound at sea level
G0 = 9.80665         # m/s^2, standard gravity
MU_SL = 1.789e-5     # Pa·s, dynamic viscosity at sea level

# Earth constants
R_EARTH = 6371e3     # m, mean radius
MU_EARTH = 3.986e14  # m^3/s^2, gravitational parameter

def speed_of_sound(T):
    """Speed of sound in air at temperature T (K)."""
    return np.sqrt(GAMMA * R_AIR * T)

def dynamic_pressure(rho, V):
    """q = 0.5 * rho * V^2  (Pa)."""
    return 0.5 * rho * V**2

def reynolds_number(rho, V, L, mu=MU_SL):
    """Re = rho * V * L / mu."""
    return rho * V * L / mu
