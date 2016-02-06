build:
	coffee -bc --no-header matrixRain.coffee
	echo '#!/usr/bin/env node' | cat - matrixRain.js > matrixRain
	rm matrixRain.js
	chmod a+x matrixRain