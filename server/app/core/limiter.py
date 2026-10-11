from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate Limiter configured by client IP address
# Mitigates brute-force credential stuffing and DoS attacks
limiter = Limiter(key_func=get_remote_address)
