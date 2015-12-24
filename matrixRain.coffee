#!/usr/bin/env coffee

fs = require 'fs'
c = console
stdout = process.stdout
numRows = stdout.rows
numCols = stdout.columns
minLength = 1
maxLength = 10
numDroplets = 10
dropletCount = 0
shuffledCols = []
droplets = []
direction = "v"
updateMs = 30
updateCount = 0
maxSpeed = 20
colorDropPropability = 0.001
filePath = null
filePos = 0
fileContents = null

# http://ascii-table.com/ansi-escape-sequences-vt-100.php
tty =
	clearScreen: "\x1b[2J",
	moveCursorToHome: "\x1b[H"
	moveCursorTo: (row,col) -> "\x1b[#{row};#{col}H"
	cursorVisible: '\x1b[?25h'
	cursorInvisible: '\x1b[?25l'
	fgColor: (c) -> "\x1b[38;5;#{c}m"
	bgColor: (c) -> "\x1b[48;5;#{c}m"
	underline: "\x1b[4m"
	bold: "\x1b[1m"
	off: "\x1b[0m"
	reset: "\x1bc"

outBuffer = ""
# perf is improved if we write to stdout in batches
write = (chars) -> outBuffer += chars
flush = ->
	stdout.write(outBuffer)
	outBuffer = ""

# on resize
stdout.on 'resize', ->
	refreshDropletParams()

# on exit
process.on 'SIGINT', ->
	write tty.reset
	write tty.cursorVisible
	flush()
	process.exit()

refreshDropletParams = ->
	numCols = stdout.columns
	numRows = stdout.rows

	# invert rows and columns
	if direction == "h"
		[numCols, numRows] = [numRows, numCols]
		if not tty.moveCursorTo.proxied
			moveCursorTo = tty.moveCursorTo
			tty.moveCursorTo = (row, col) -> moveCursorTo(col, row)
			tty.moveCursorTo.proxied = true

	minLength = numRows
	maxLength = numRows * 5
	numDroplets = numCols  * 2

	#create shuffled cols array
	shuffledCols = [0...numCols]
	for i in [0...numCols]
		rnd = rand(0, numCols)
		[shuffledCols[i], shuffledCols[rnd]] = [shuffledCols[rnd], shuffledCols[i]]

createDroplet  = () ->
	droplet =
		col: shuffledCols[dropletCount++ % numCols]
		row: 0
		length: rand(minLength, maxLength)
		speed: rand(1, maxSpeed)
	droplet.chars = getChars(droplet.length)
	droplets.push droplet
	return

updateDroplets = ->
	updateCount++
	remainingDroplets = []
	for drop in droplets
		# remove out of bounds drops
		if (drop.row - drop.length) >= numRows or drop.col >= numCols
			continue
		else
			remainingDroplets.push(drop)

		# process drop speed
		if (updateCount % drop.speed) == 0
			# update old head
			if drop.row > 0 and drop.row <= (numRows + 1)
				write tty.moveCursorTo(drop.row - 1, drop.col)
				if Math.random() < colorDropPropability
					write tty.fgColor(rand(1,255))
					write drop.headChar
					write tty.off
				else
					# change head back to default
					write drop.headChar

			if drop.row <= numRows
				# write new head
				write tty.moveCursorTo(drop.row, drop.col)
				write tty.fgColor(7) #white
				write tty.underline
				drop.headChar = drop.chars.charAt(drop.row)
				write drop.headChar
				write tty.off

			if (drop.row - drop.length) >= 0
				# remove tail
				write tty.moveCursorTo(drop.row - drop.length, drop.col)
				write " "

			drop.row++

	droplets = remainingDroplets
	if droplets.length < numDroplets
		createDroplet()
	flush()

rand = (start, end) ->
	start + Math.floor(Math.random() * (end - start))

getChars = (len) ->
	chars = ""
	for i in [0...len] by 1
		chars += String.fromCharCode(rand(0x21, 0x7E))
	return chars

getFileChars = (len) ->
	chars = fileContents.substr(filePos, len)
	if chars.length isnt len
		filePos = len - chars.length
		chars += fileContents.substr(0, filePos)
	else
		filePos += len
	return chars

readFileContents = ->
	if filePath
		fileContents = fs.readFileSync(filePath, "utf-8")
		fileContents = fileContents.replace(/^\s+|\r|\n/gm, " ")
		getChars = getFileChars

parseCliParams = ->
	args = process.argv.splice(2)
	for arg in args
		if arg == "--help"
			c.log "Usage: matrix-rain opts? filePath?"
			c.log "opts: --direction=v|h = change direction. If reading from file direction is h (horizontal)"
			c.log "filePath: Read characters from file and set direction=h"
			c.log "By default generate random ascii chars in v (vertical) direction"
			process.exit(0)

		if arg.indexOf("--direction") == 0
			match = arg.match(/^\-\-direction=(v|h)/)
			if match
				direction = match[1]
			else
				c.error "unrecognized direction arg", arg
				process.exit(1)

		else #default fileArg
			filePath = arg
			if not fs.existsSync(filePath)
				c.error "Can't find", filePath
				process.exit(1)
			if args.length == 1
				direction = "h"
	return

# initialize
parseCliParams()
write tty.clearScreen
write tty.cursorInvisible
flush()
readFileContents()
refreshDropletParams()
setInterval updateDroplets, 10
