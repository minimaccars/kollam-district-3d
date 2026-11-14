"""Shared grid definition: a local metric grid centred on Kollam district."""
import math

W, S, E, N = 76.40, 8.70, 77.30, 9.22          # detailed 3D area
BW, BS, BE, BN = 76.18, 8.30, 77.52, 9.62          # backdrop (terrain + imagery only)
LON0, LAT0 = (W + E) / 2, (S + N) / 2
MX = 111320.0 * math.cos(math.radians(LAT0))         # metres per degree lon
MY = 110574.0                                        # metres per degree lat

def to_xy(lon, lat):
    """lon/lat -> metres east, metres north of the grid centre."""
    return (lon - LON0) * MX, (lat - LAT0) * MY

def to_ll(x, y):
    return LON0 + x / MX, LAT0 + y / MY

HALF_X = (E - LON0) * MX
HALF_Y = (N - LAT0) * MY
BX0, BY0 = to_xy(BW, BS)
BX1, BY1 = to_xy(BE, BN)
