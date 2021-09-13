#!/usr/bin/env node

const fs = require(`fs`);
const ArgumentParser = require(`argparse`).ArgumentParser;
const ansi = require(`./ansi`);
const npmPackage = JSON.parse(fs.readFileSync(`${__dirname}/package.json`));

const argParser = new ArgumentParser({
  version: npmPackage.version,
  description: `The famous Matrix rain effect of falling green characters as a cli command`,
});

[
  {
    flags: [ `-d`, `--direction` ],
    opts: {
      choices: [`h`, `v`],
      defaultValue: `v`,
      help: `Change direction of rain. h=horizontal, v=vertical.`,
    },
  },
  {
    flags: [ `-c`, `--color` ],
    opts: {
      choices: [`green`, `red`, `blue`, `yellow`, `magenta`, `cyan`, `white`],
      defaultValue: `green`,
      dest: `color`,
      help: `Rain color. NOTE: droplet start is always white.`,
    },
  },
  {
    flags: [ `-k`, `--char-range` ],
    opts: {
      choices: [`ascii`, `binary`, `braille`, `emoji`, `katakana`, 'lil-guys'],
      defaultValue: `ascii`,
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
].forEach(({flags, opts}) => argParser.addArgument(flags, opts));


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
      const pos = this.transpose ? ansi.cursorPos(col, row) : ansi.cursorPos(row, col);
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
}


//// main ////

const args = argParser.parseArgs();
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

start();
