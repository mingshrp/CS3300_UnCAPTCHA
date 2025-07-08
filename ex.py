import twocaptcha

solver = twocaptcha.TwoCaptcha('be44e18829a741db9aa36197b870a163')
result = solver.normal('test.jpg')
print(result)
