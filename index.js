#!/usr/bin/env node

const fs = require(`fs`);
const ArgumentParser = require(`argparse`).ArgumentParser;
const ansi = require(`./ansi`);
const npmPackage = JSON.parse(fs.readFileSync(`${__dirname}/package.json`));
const art = require(`ascii-art`);
const strip = require(`strip-ansi`);

const argParser = new ArgumentParser({
  description: `The famous Matrix rain effect of falling green characters as a cli command`,
});

[
  {
    flags: [ `-v`, `--version` ],
    opts: {
      action: `version`,
      version: npmPackage.version
    },
  },
  {
    flags: [ `-d`, `--direction` ],
    opts: {
      choices: [`h`, `v`],
      default: `v`,
      help: `Change direction of rain. h=horizontal, v=vertical.`,
    },
  },
  {
    flags: [ `-c`, `--color` ],
    opts: {
      choices: [`green`, `red`, `blue`, `yellow`, `magenta`, `cyan`, `white`],
      default: `green`,
      dest: `color`,
      help: `Rain color. NOTE: droplet start is always white.`,
    },
  },
  {
    flags: [ `-k`, `--char-range` ],
    opts: {
      choices: [`ascii`, `binary`, `braille`, `emoji`, `katakana`, `lil-guys`, `picto`],
      default: `ascii`,
      dest: `charRange`,
      help: `Use rain characters from char-range.`,
    },
  },
  {
    flags: [ `-f`, `--file-path` ],
    opts: {
      dest: `filePath`,
      help: `Read characters from a file instead of random characters from char-range.`,
    },
  },
  {
    flags: [ `-m`, `--mask-path` ],
    opts: {
      dest: `maskPath`,
      help: `Use the specified image to build a mask for the raindrops.`,
    },
  },
  {
    flags: [ `-i`, `--invert-mask` ],
    opts: {
      action: `store_true`,
      dest: `invertMask`,
      help: `Invert the mask specified with --mask-path.`,
    },
  },
  {
    flags: [ `--offset-row` ],
    opts: {
      type: `int`,
      default: 0,
      dest: `offsetRow`,
      help: `Move the upper left corner of the mask down n rows.`,
    },
  },
  {
    flags: [ `--offset-col` ],
    opts: {
      type: `int`,
      default: 0,
      dest: `offsetCol`,
      help: `Move the upper left corner of the mask right n columns.`,
    },
  },
  {
    flags: [ `--font-ratio` ],
    opts: {
      type: `int`,
      default: 2,
      dest: `fontRatio`,
      help: `ratio between character height over width in the terminal.`,
    },
  },
  {
    flags: [ `--print-mask` ],
    opts: {
      action: `store_true`,
      dest: `printMask`,
      help: `Print mask and exit.`,
    },
  },
].forEach(({flags, opts}) => argParser.add_argument(...flags, opts));


// Simple string stream buffer + stdout flush at once
let outBuffer = [];
function write(chars) {
  return outBuffer.push(chars);
}

function flush() {
  process.stdout.write(outBuffer.join(``));
  return outBuffer = [];
}

function rand(start, end) {
  return start + Math.floor(Math.random() * (end - start));
}


class MatrixRain {
  constructor(opts) {
    this.transpose = opts.direction === `h`;
    this.color = opts.color;
    this.charRange = opts.charRange;
    this.maxSpeed = 20;
    this.colDroplets = [];
    this.numCols = 0;
    this.numRows = 0;

    // handle reading from file
    if (opts.filePath) {
      if (!fs.existsSync(opts.filePath)) {
        throw new Error(`${opts.filePath} doesn't exist`);
      }
      this.fileChars = fs.readFileSync(opts.filePath, `utf-8`).trim().split(``);
      this.filePos = 0;
      this.charRange = `file`;
    }

    // handle ascii art mask
    if (opts.maskPath) {
      this.maskConf = {
        filepath: opts.maskPath,
        alphabet: `bits`,
        width: this.numCols,
        height: this.numRows * opts.fontRatio,
      };
      this.maskInverted = opts.invertMask;
      this.mask = undefined;
      this.fontRatio = opts.fontRatio;
      this.maskWidth = 0;
      this.maskHeight = 0;
      this.maskOffsetRow = opts.offsetRow;
      this.maskOffsetCol = opts.offsetCol;
      this.maskBlankChar = ` `;
    }

    if (opts.printMask) {
      if (!opts.maskPath) {
        console.log("no mask file provided.");
        stop()
      }

      this.computeMask().then((mask) => {
        for (let r in [0..this.maskOffsetRow]) {
          console.log("");
        }
        mask.forEach((row, i) => {
          console.log(" ".repeat(this.maskOffsetCol), row);
        });
        stop();
      });
    }
  }

  generateChars(len, charRange) {
    // by default charRange == ascii
    let chars = new Array(len);

    if (charRange === `ascii`) {
      for (let i = 0; i < len; i++) {
        chars[i] = String.fromCharCode(rand(0x21, 0x7E));
      }
    } else if (charRange === `binary`) {
      for (let i = 0; i < len; i++) {
        chars[i] = String.fromCharCode(rand(0x30, 0x32));
      }
    } else if (charRange === `braille`) {
      for (let i = 0; i < len; i++) {
        chars[i] = String.fromCharCode(rand(0x2840, 0x28ff));
      }
    } else if (charRange === `katakana`) {
      for (let i = 0; i < len; i++) {
        chars[i] = String.fromCharCode(rand(0x30a0, 0x30ff));
      }
    } else if (charRange === `picto`) {
      for (let i = 0; i < len; i++) {
        chars[i] = String.fromCharCode(rand(0x4e00, 0x9fa5));
      }
    } else if (charRange === `emoji`) {
      // emojis are two character widths, so use a prefix
      const emojiPrefix = String.fromCharCode(0xd83d);
      for (let i = 0; i < len; i++) {
        chars[i] = emojiPrefix + String.fromCharCode(rand(0xde01, 0xde4a));
      }
    } else if (charRange === `lil-guys`) {
      // Force horizontal direction
      if (!this.transpose) {
        this.transpose = true;
        this.color = 'white'
        start();
      }

      for (let i = 0; i < len; i++) {
        chars[i] = '  ~~o ';
      }
    } else if (charRange === `file`) {
      for (let i = 0; i < len; i++, this.filePos++) {
        this.filePos = this.filePos < this.fileChars.length ? this.filePos : 0;
        chars[i] = this.fileChars[this.filePos];
      }
    }

    return chars;
  }

  makeDroplet(col) {
    return {
      col,
      alive: 0,
      curRow: rand(0, this.numRows),
      height: rand(this.numRows / 2, this.numRows),
      speed: rand(1, this.maxSpeed),
      chars: this.generateChars(this.numRows, this.charRange),
    };
  }

  resizeDroplets() {
    [this.numCols, this.numRows] = process.stdout.getWindowSize();

    if (this.maskConf) {
      this.maskConf.width = this.numCols;
      this.maskConf.height = this.numRows * this.fontRatio;
      this.computeMask().then(mask => this.mask = mask);
    }

    // transpose for direction
    if (this.transpose) {
      [this.numCols, this.numRows] = [this.numRows, this.numCols];
    }

    // Create droplets per column
    // add/remove droplets to match column size
    if (this.numCols > this.colDroplets.length) {
      for (let col = this.colDroplets.length; col < this.numCols; ++col) {
        // make two droplets per row that start in random positions
        this.colDroplets.push([this.makeDroplet(col), this.makeDroplet(col)]);
      }
    } else {
      this.colDroplets.splice(this.numCols, this.colDroplets.length - this.numCols);
    }
  }

  writeAt(row, col, str, color) {
    // Only output if in viewport
    if (row >=0 && row < this.numRows && col >=0 && col < this.numCols) {
      if (this.transpose) {
        [col, row] = [row, col];
      }
      const pos = ansi.cursorPos(row, col);
      if (this.mask) {
        const maskRow = row - this.maskOffsetRow;
        const maskCol = col - this.maskOffsetCol;
        if(maskRow >= 0 && maskCol >= 0 && maskRow < this.maskHeight && maskCol < this.maskWidth && this.mask[maskRow] && this.mask[maskRow][maskCol] === this.maskBlankChar) {
          str = ` `;
        }
      }
      write(`${pos}${color || ``}${str || ``}`);
    }
  }

  renderFrame() {
    const ansiColor = ansi.colors[`fg${this.color.charAt(0).toUpperCase()}${this.color.substr(1)}`]();

    for (const droplets of this.colDroplets) {
      for (const droplet of droplets) {
        const {curRow, col: curCol, height} = droplet;
        droplet.alive++;

        if (droplet.alive % droplet.speed === 0) {
          this.writeAt(curRow - 1, curCol, droplet.chars[curRow - 1], ansiColor);
          this.writeAt(curRow, curCol, droplet.chars[curRow], ansi.colors.fgWhite());
          this.writeAt(curRow - height, curCol, ` `);
          droplet.curRow++;
        }

        if (curRow - height > this.numRows) {
          // reset droplet
          Object.assign(droplet, this.makeDroplet(droplet.col), {curRow: 0});
        }
      }
    }

    flush();
  }

  computeMask() {
    return new Promise((resolve, reject) => {
        (new art.Image(Object.assign({}, this.maskConf))).write((err, render) => {
            if (err) {
              console.error(err);
              stop();
              reject(err);
            }
            let mask = strip(render).split(`\n`);
            mask = mask.slice(0, mask.length - 1);
            this.maskWidth = mask[0].length;
            this.maskHeight = mask.length;
            this.maskBlankChar = this.maskInverted
              ? `#`
              : ` `;
            resolve(mask);
          }
        );
      }
    );
  }
}


//// main ////

const args = argParser.parse_args();
const matrixRain = new MatrixRain(args);

function start() {
  if (!process.stdout.isTTY) {
    console.error(`Error: Output is not a text terminal`);
    process.exit(1);
  }

  // clear terminal and use alt buffer
  process.stdin.setRawMode(true);
  write(ansi.useAltBuffer());
  write(ansi.cursorInvisible());
  write(ansi.colors.bgBlack());
  write(ansi.colors.fgBlack());
  write(ansi.clearScreen());
  flush();
  matrixRain.resizeDroplets();
}

function stop() {
  write(ansi.cursorVisible());
  write(ansi.clearScreen());
  write(ansi.cursorHome());
  write(ansi.useNormalBuffer());
  flush();
  process.exit();
}

process.on(`SIGINT`, () => stop());
process.stdin.on(`data`, () => stop());
process.stdout.on(`resize`, () => matrixRain.resizeDroplets());
setInterval(() => matrixRain.renderFrame(), 16); // 60FPS

if (!args.printMask) {
  start();
}

