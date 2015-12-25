# Matrix Rain in terminal with node

## Installation

```
npm install -g matrix-rain
```

## Usage

```
matrix-rain --help
Usage: matrix-rain opts? filePath?
opts: --direction=v|h = change direction. If reading from file direction is h (horizontal)
filePath: Read characters from file and set direction=h
By default generate random ascii chars in v (vertical) direction
```

## Story Time
On christmas eve I watched the The Matrix (1999) and was inspired by the matrix effect. I was curious to see if I could replicate this effect without using other node modules.

There's [blessed](https://github.com/chjj/blessed) and [node-ncurses](https://github.com/mscdex/node-ncurses) which would have helped but rather than using the library I wanted to learn how console cursor manipulation works behind the scenes. I browsed through the source code of [colors.js](https://github.com/marak/colors.js/) and got a few pointers. Thank you github.

I've been programming for 6 years full time but on that day I discovered terminal escape codes. I googled around and found [VT100 ANSI codes table](# http://ascii-table.com/ansi-escape-sequences-vt-100.php)

I disovered process.stdout has a columns and rows property. It also fires a resize even when console is resized. With escape codes I can clear the screen, move the cursor to any position in the screen, change colors and do really cool things which previously I thought was vodoo magic. There's even support for 8 bit colors in console. Whoah! All I have to do is write the appropriate escape code sequence in stdout and that is it.

!(http://suptg.thisisnotatrueending.com/archive/25731506/images/1372606872145.gif)

I learned a couple of things

 * Its faster if I flush commands to stdout when I have finished rendering a frame rather than doing it immediately
 * Writing utf-8 is slower than ascii. I tried random kanji characters but it was about twice as slow. Not sure why.
 * Rather than clearing entire screen and drawing the everything again, its much faster to only modify parts of screen that have changed.
 
Initial algorithm somewhat worked. I wondered what else I could do. I used a trick to change swap numRows and numCols and I could render the matrix horizontally. Rather than generate random ascii characters, what if I could read characters from a file.

This had an interesting side effect that it was a great visualization of the source code. It looked like the computer was programming itself in parallel. I changed the code so it uses jquery.js and voila! I was reading snippets of jquery source code. While I took my dog for a run, I left it running. My wife (non-technical) sent me a message "Hey your computer is in the matrix, its really cool!". Younger noj would be very impressed of older noj.

The source code matrixRain.coffee is < 200 lines of code. 

Being in a large software company, I don't don't get to do fun things like this often. This was one of the things that really sparked up the inner geek in me. 
