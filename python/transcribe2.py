import sys
import os
import speech_recognition as sr
import urllib
import time

url = sys.argv[1]
filename = str(time.time())+'.wav'
urllib.urlretrieve(url,"python/recordings/"+filename)

os.system('sox python/recordings/'+filename+' -b 16 python/recordings/resampled.'+filename+' rate 8k')

r = sr.Recognizer()
with sr.WavFile("python/recordings/resampled."+filename) as source:
	audio = r.record(source)

try:
	print(r.recognize(audio))
except LookupError:
	print("")

os.remove('python/recordings/'+filename)
os.remove('python/recordings/resampled.'+filename)
