# Matrix Rain

The famous Matrix rain effect of falling green characters in a terminal with node.

## Installation

```
npm install -g matrix-rain
```

## Usage

```
usage: matrix-rain [-h] [-v] [-d {h,v}]
                [-c {green,red,blue,yellow,magenta,cyan,white}]
                [-k {ascii,binary,braille,emoji,katakana}] [-f FILEPATH]


The famous Matrix rain effect of falling green characters as a cli command

Optional arguments:
  -h, --help            Show this help message and exit.
  -d, --direction {h,v}
                        Change direction of rain. h=horizontal, v=vertical
  -c , --color {green,red,blue,yellow,magenta,cyan,white}
                        Rain color. NOTE: droplet start is always white
  -k, --char-range {ascii,binary,braille,emoji,katakana}
                        Use rain characters from char-range
  -f, --file-path FILEPATH
                        Read characters from a file instead of random
                        characters from char-range
```
## Screenshots

![Vertical Matrix](https://media.giphy.com/media/NA5S7F2dikADu/giphy.gif)

![Horizontal Matrix](https://media.giphy.com/media/uSV1MnXz3RM3u/giphy.gif)

## Story Time
On 2016 christmas eve, I watched the The Matrix (1999) and was inspired by the matrix rain effect. I was curious to see if I could replicate this effect in nodejs.

There's [blessed](https://github.com/chjj/blessed) and [node-ncurses](https://github.com/mscdex/node-ncurses) which would have helped but rather than using the library I wanted to learn how console cursor manipulation works behind the scenes. I browsed through the source code of [colors.js](https://github.com/marak/colors.js/) and got a few pointers. On that day I discovered terminal escape codes [VT100 ANSI codes table](http://ascii-table.com/ansi-escape-sequences-vt-100.php). There is also the comprehensive xterm control sequences documentation [ctlseqs](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html).

Node's process.stdout has a columns and rows property. It also fires resize events like the browser. With escape codes I can treat the terminal as a canvas and paint on it. I discovered a new medium to show my art.

In general its very possible to build interactive terminal apps with great UX that are lightweight and blazing fast. I'm on that journey.
