import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

from twocaptcha import TwoCaptcha

api_key = os.getenv('APIKEY_2CAPTCHA', 'be44e18829a741db9aa36197b870a163')

solver = TwoCaptcha(api_key)

try:
  result = solver.normal('test5.jpg')

except Exception as e:
  sys.exit(e)

else:
  sys.exit('Solved. Here is the answer: ' + str(result))
  