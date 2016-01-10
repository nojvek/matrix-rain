build:
	coffee -bc --no-header matrixRain.coffee
	echo '#!'`which node` | cat - matrixRain.js > matrixRain
	rm matrixRain.js
	chmod a+x matrixRain