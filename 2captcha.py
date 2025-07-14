import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
load_dotenv()

from twocaptcha import TwoCaptcha

api_key = os.getenv('APIKEY_2CAPTCHA')

solver = TwoCaptcha(api_key)

try:
  result = solver.normal('test5.jpg')

except Exception as e:
  sys.exit(e)

else:
  sys.exit('Solved. Here is the answer: ' + str(result)) 