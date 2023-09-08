// @ts-check

/**
 * @todo 点数の厳密な判定
 * @todo エフェクト
 * @todo ボタン
 * @todo downするタイミング
 * @todo start screen
 */

(async () => {
  "use strict";

  /**
   * @param {string} url
   * @returns {Promise<HTMLImageElement>}
   */
  const loadImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      resolve(image);
    });
    image.addEventListener("error", (e) => {
      reject(e.error);
    });
    image.src = url;
  });

  /**
   * @template {Record<string, Record<string, string>>} T
   * @param {T} obj
   */
  const loadImagesObj = async (obj) => {
    return /** @type {Promise<{[P in keyof T]: Record<keyof T[P], HTMLImageElement> }>}  */ (
      Object.fromEntries(await Promise.all(
        Object.entries(obj).map(async ([key, urls]) => await Promise.all([key, Object.fromEntries(
          await Promise.all(
            Object.entries(urls).map(async ([subKey, url]) => ([subKey, await loadImage(url)]))
          )
        )]))
      ))
    );
  };

  const images = await loadImagesObj({
    iceBlocks: {
      I: "./assets/images/ice-blocks/i.png",
      O: "./assets/images/ice-blocks/o.png",
      S: "./assets/images/ice-blocks/s.png",
      Z: "./assets/images/ice-blocks/z.png",
      J: "./assets/images/ice-blocks/j.png",
      L: "./assets/images/ice-blocks/l.png",
      T: "./assets/images/ice-blocks/t.png"
    },
    middleBlocks: {
      I: "./assets/images/middle-blocks/i.png",
      O: "./assets/images/middle-blocks/o.png",
      S: "./assets/images/middle-blocks/s.png",
      Z: "./assets/images/middle-blocks/z.png",
      J: "./assets/images/middle-blocks/j.png",
      L: "./assets/images/middle-blocks/l.png",
      T: "./assets/images/middle-blocks/t.png"
    },
    misc: {
      logo: "./assets/images/logo.svg"
    }
  });

  /**
   * @typedef {(ctx: CanvasRenderingContext2D) => CanvasRendererInstance[] | void} CanvasRendererInstance
   */

  /**
   * @template {object | void} T
   * @template {object} U
   * @typedef {((props: T) => CanvasRendererInstance) & U} CanvasRenderer
   */

  /**
   * @template {object | void} T
   * @template {object} U
   * @typedef {{
   *   render: (props: T, ctx: CanvasRenderingContext2D) => CanvasRendererInstance[] | void
   *   static?: U
   * }} RendererOptions
   */

  /**
   * @template {object | void} T
   * @template {object} U
   * @param {RendererOptions<T, U>} options
   * @return {CanvasRenderer<T, U>}
   */
  const createRenderer = (options) => {
    return Object.assign(
      (/** @type {T} */ props) => (
        (/** @type {CanvasRenderingContext2D} */ ctx) => options.render(props, ctx)
      ),
      options.static
    );
  };

  class Root {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
      this.canvas = canvas;
      const ctx = this.canvas.getContext("2d");
      if (!ctx) {
        throw new Error("ctx is null");
      }
      this.ctx = ctx;
    }

    /**
     * @param {() => CanvasRendererInstance} renderRoot
     */
    setUp(renderRoot) {
      const frame = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.draw(renderRoot());
        requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    }

    /**
     * @param {CanvasRendererInstance} render
     */
    draw(render) {
      this.ctx.save();
      const children = render(this.ctx);
      this.ctx.restore();
      if (children) {
        for (const child of children) {
          this.draw(child);
        }
      }
    }
  }

  class Interval {
    /**
     * @param {() => void} callback
     */
    constructor(callback) {
      this.callback = callback;
    }

    /**
     * @param {number} delay
     */
    start(delay) {
      this.stop();
      this.interval = setInterval(this.callback, delay);
    }

    stop() {
      clearInterval(this.interval);
    }
  }

  class Timeout {
    /**
     * @param {() => void} callback
     */
    constructor(callback) {
      this.callback = callback;
    }

    /**
     * @param {number} delay
     */
    start(delay) {
      this.cancel();
      this.timeout = setTimeout(this.callback, delay);
    }

    cancel() {
      clearTimeout(this.timeout);
    }
  }

  /**
   * @template {any[]} EVENTS
   * @template {object | void} OPTIONS
   */
  class OriginalEvent {
    /**
     * @type {Set<(...eventArgs: EVENTS) => void>}
     */
    handlers = new Set();
    initCalled = false;

    /**
     * @param {(dispatchAll: (...eventArgs: EVENTS) => void) => (
     *   (options: OPTIONS, dispatch: (...eventArgs: EVENTS) => void) => void
     * ) | void} init
     */
    constructor(init) {
      this.init = init;
    }

    /**
     * @param {(...eventArgs: EVENTS) => void} handler
     * @param {OPTIONS} options
     */
    addListener(handler, options) {
      if (!this.initCalled) {
        this.afterEventAdded = this.init(this.dispatchAll);
        this.initCalled = true;
      }

      this.afterEventAdded?.(options, handler);

      this.handlers.add(handler);

      return {
        remove: () => {
          this.handlers.delete(handler);
        }
      };
    }

    /**
     * @param  {EVENTS} eventArgs
     * @private
     */
    dispatchAll = (...eventArgs) => {
      for (const handler of this.handlers) {
        handler(...eventArgs);
      }
    };
  }

  /**
   * @type {OriginalEvent<[KeyboardEvent], void>}
   */
  const onKeyDown = new OriginalEvent((dispatchAll) => {
    document.addEventListener("keydown", dispatchAll);
  });

  /**
   * @type {OriginalEvent<[KeyboardEvent], void>}
   */
  const onKeyUp = new OriginalEvent((dispatchAll) => {
    document.addEventListener("keyup", dispatchAll);
  });

  /**
   * @typedef {{
   *   repeat: boolean;
   * }} onKeyDownRepeatDetail
   */

  /**
   * @typedef {{
   *   delay?: number;
   *   repeat: number;
   * }} onKeyDownRepeatOptions
   */

  /**
   * @type {OriginalEvent<[KeyboardEvent, onKeyDownRepeatDetail], onKeyDownRepeatOptions>}
   */
  const onKeyDownRepeat = new OriginalEvent(() => {
    /**
     * @type {KeyboardEvent | null}
     */
    let prevKeyDownEvent = null;

    onKeyDown.addListener((e) => {
      prevKeyDownEvent = e;
    });

    return (options, dispatch) => {
      const {
        delay = 0,
        repeat
      } = options;

      const interval = new Interval(() => {
        if (prevKeyDownEvent) {
          dispatch(prevKeyDownEvent, { repeat: true });
        }
      });

      const afterTimeout = () => {
        interval.start(repeat);
        if (prevKeyDownEvent) {
          dispatch(prevKeyDownEvent, { repeat: false });
        }
      };

      const timeout = new Timeout(afterTimeout);

      onKeyDown.addListener((e) => {
        if (e.repeat) {
          return;
        }
        timeout.cancel();
        interval.stop();
        dispatch(e, { repeat: false });
        if (delay) {
          timeout.start(delay);
        } else {
          afterTimeout();
        }
      });

      onKeyUp.addListener((e) => {
        if (e.code === prevKeyDownEvent?.code) {
          timeout.cancel();
          interval.stop();
        }
      });
    };
  });

  /**
   * @typedef {string | CanvasGradient | CanvasPattern} CanvasColorStyle
   */

  /**
   * @typedef {{
   *   text: string;
   *   x: number;
   *   y: number;
   *   size: number;
   *   color: CanvasColorStyle;
   *   align?: CanvasTextAlign;
   * }} TextProps
   */

  /**
   * @type {CanvasRenderer<TextProps, {}>}
   */
  const TextRenderer = createRenderer({
    render({ text, x, y, size, color, align = "left" }, ctx) {
      ctx.font = `${size}px Rajdhani`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }
  });

  /**
   * @typedef {{
   *   x: number;
   *   y: number;
   *   width: number;
   *   height: number;
   *   color: CanvasColorStyle;
   * }} RectProps
   */

  /**
   * @type {CanvasRenderer<RectProps, {}>}
   */
  const RectRenderer = createRenderer({
    render({ x, y, width, height, color }, ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    }
  });

  /**
   * @typedef {{
   *   color: CanvasColorStyle;
   *   x: number;
   *   y: number;
   *   radius: number;
   * }} CircleProps
   */

  /**
   * @type {CanvasRenderer<CircleProps, {}>}
   */
  const CircleRenderer = createRenderer({
    render({ color, x, y, radius }, ctx) {
      ctx.fillStyle = color;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /**
   * @typedef {{
   *   image: CanvasImageSource;
   *   x: number;
   *   y: number;
   *   width: number;
   *   height: number;
   * }} ImageProps
   */

  /**
   * @type {CanvasRenderer<ImageProps, {}>}
   */
  const ImageRenderer = createRenderer({
    render({ image, x, y, width, height }, ctx) {
      ctx.drawImage(image, x, y, width, height);
    }
  });

  /**
   * @typedef {{ isEmpty: boolean }} FieldBlock
   */

  /**
   * @implements {FieldBlock}
   */
  class EmptyBlock {
    /**
     * @readonly
     */
    isEmpty = true;
  }

  /**
   * @typedef {FieldBlock & { appearance: string | HTMLImageElement }} DrawableBlock
   */

  /**
   * @typedef {{ block: DrawableBlock; x: number; y: number; }} FieldBlockProps
   */

  /**
   * @typedef {{ SIZE: number }} FieldBlockStatic
   */

  /**
   * @type {CanvasRenderer<FieldBlockProps, FieldBlockStatic>}
   */
  const FieldBlockRenderer = createRenderer({
    render({ block, x, y }, ctx) {
      if (block.isEmpty) {
        return;
      }

      return typeof block.appearance === "string"
        ? [
          RectRenderer({
            x,
            y,
            width: FieldBlockRenderer.SIZE,
            height: FieldBlockRenderer.SIZE,
            color: block.appearance
          })
        ]
        : [
          ImageRenderer({
            image: block.appearance,
            x,
            y,
            width: FieldBlockRenderer.SIZE,
            height: FieldBlockRenderer.SIZE
          })
        ];
    },

    static: {
      SIZE: 50
    }
  });

  /**
   * @implements {DrawableBlock}
   */
  class Block {
    /**
     * @readonly
     */
    isEmpty = false;

    /**
     * @param {string | HTMLImageElement} appearance
     */
    constructor(appearance) {
      this.appearance = appearance;
    }
  }

  /**
   * @typedef {"ice" | "middle" | "melted"} MeltStatus
   */

  /**
   * @typedef {{ base: number; range: number }} MeltOption
   */

  /**
   * @typedef {{ iceToMiddle: MeltOption; middleToWater: MeltOption; }} MeltableBlockMeltOptions
   */

  /**
   * @implements {DrawableBlock}
   */
  class MeltableBlock {
    isEmpty = false;

    /**
     * @type {MeltStatus}
     */
    status = "ice";
    melting = false;

    iceToMiddleTimer = new Timeout(() => {
      this.status = "middle";
      this.appearance = this.tetrominoData.middleImage;
      const { base, range } = this.meltOptions.middleToWater;
      this.middleToWaterTimer.start((Math.random() * range + base) * 1000);
    });

    middleToWaterTimer = new Timeout(() => {
      this.status = "melted";
      this.melting = false;
      this.isEmpty = true;
    });

    /**
     * @param {string} type
     * @param {MeltableBlockMeltOptions} meltOptions
     */
    constructor(type, meltOptions) {
      const tetrominoData = TETROMINO_SHAPES.get(type);
      if (!tetrominoData) {
        throw new TypeError("Invalid argument type.");
      }

      this.appearance = tetrominoData.iceImage;
      this.tetrominoData = tetrominoData;
      this.meltOptions = meltOptions;
    }

    startMelt() {
      const { range, base } = this.meltOptions.iceToMiddle;
      this.iceToMiddleTimer.start((Math.random() * range + base) * 1000);
      this.melting = true;
    }

    stopMelt() {
      this.iceToMiddleTimer.cancel();
      this.middleToWaterTimer.cancel();
      this.melting = false;
    }
  }

  const TETROMINO_SHAPES = new Map([
    ["I", {
      shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      iceImage: images.iceBlocks.I,
      middleImage: images.middleBlocks.I
    }],
    ["O", {
      shape: [
        [1, 1],
        [1, 1]
      ],
      iceImage: images.iceBlocks.O,
      middleImage: images.middleBlocks.O
    }],
    ["S", {
      shape: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ],
      iceImage: images.iceBlocks.S,
      middleImage: images.middleBlocks.S
    }],
    ["Z", {
      shape: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ],
      iceImage: images.iceBlocks.Z,
      middleImage: images.middleBlocks.Z
    }],
    ["J", {
      shape: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      iceImage: images.iceBlocks.J,
      middleImage: images.middleBlocks.J
    }],
    ["L", {
      shape: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ],
      iceImage: images.iceBlocks.L,
      middleImage: images.middleBlocks.L
    }],
    ["T", {
      shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      iceImage: images.iceBlocks.T,
      middleImage: images.middleBlocks.T
    }]
  ]);

  /**
   * @typedef {(Block | EmptyBlock | MeltableBlock)[][]} Shape
   */

  /**
   * @typedef {{ x: number, y: number, shape: Shape }} BlockGroupProps
   */

  /**
   * @type {CanvasRenderer<BlockGroupProps, {}>}
   */
  const BlockGroupRenderer = createRenderer({
    render({ shape, x, y }) {
      const blocks = shape.flatMap((row, rowIndex) => (
        row.flatMap((block, colIndex) => (
          block.isEmpty
            ? []
            : [FieldBlockRenderer({
              block,
              x: x + colIndex * FieldBlockRenderer.SIZE,
              y: y + rowIndex * FieldBlockRenderer.SIZE
            })]
        ))
      ));
      return blocks;
    }
  });

  /**
   * @typedef {{ tetromino: Tetromino; x: number; y: number; }} TetrominoProps
   */

  class Tetromino {
    /**
     * @type {CanvasRenderer<TetrominoProps, {}>}
     */
    static Renderer = createRenderer({
      render({ tetromino, x, y }) {
        return [BlockGroupRenderer({
          shape: tetromino.shape,
          x,
          y
        })];
      }
    });

    static usedNumbers = new Set();

    static random() {
      if (this.usedNumbers.size === 7) {
        this.usedNumbers.clear();
      }

      while (true) {
        const tempRandom = Math.floor(Math.random() * 7);
        if (!this.usedNumbers.has(tempRandom)) {
          this.usedNumbers.add(tempRandom);
          return new Tetromino([...TETROMINO_SHAPES.keys()][tempRandom]);
        }
      }
    }

    /**
     * @param {string} type
     */
    constructor(type) {
      this.type = type;
      this.shape = this.getInitialShape();
      this.width = Math.max(...this.shape.map(row => row.length));
      this.height = this.shape.length;
    }

    getInitialShape() {
      const tetrominoData = TETROMINO_SHAPES.get(this.type);
      if (!tetrominoData) {
        throw new TypeError("Invalid argument type.");
      }
      return tetrominoData.shape.map((
        (row) => row.map((isEmpty) => isEmpty ? new Block(tetrominoData.iceImage) : new EmptyBlock())
      ));
    }
  }

  /**
   * @typedef {{ fieldTetromino: FieldTetromino }} FieldTetrominoProps
   */

  class FieldTetromino {
    /**
     * @type {CanvasRenderer<FieldTetrominoProps, {}>}
     */
    static Renderer = createRenderer({
      render({ fieldTetromino }) {
        const tetrominoX = Field.Renderer.X + (FieldBlockRenderer.SIZE * fieldTetromino.fieldX);
        const tetrominoY = Field.Renderer.Y + (FieldBlockRenderer.SIZE * (fieldTetromino.fieldY - Field.VISIBLE_HEIGHT));
        return [
          Tetromino.Renderer({
            tetromino: fieldTetromino.tetromino,
            x: tetrominoX,
            y: tetrominoY
          })
        ];
      }
    });

    /**
     * @param {Tetromino} tetromino
     * @param {number} fieldY
     */
    constructor(tetromino, fieldY) {
      this.tetromino = tetromino;
      this.fieldX = Math.floor((Field.WIDTH + tetromino.width) / 2 - tetromino.width);
      this.fieldY = fieldY;
      this.direction = 0;
    }

    /**
     * @param {number} moveX
     * @param {number} moveY
     */
    move(moveX, moveY) {
      this.fieldX += moveX;
      this.fieldY += moveY;
    }

    /**
     * @param {1 | -1} direction
     */
    getRotateDirection(direction) {
      const newDirection = this.direction + direction;
      if (newDirection < 0) {
        return 4 + direction;
      }
      if (newDirection > 3) {
        return -1 + direction;
      }
      return newDirection;
    }

    /**
     * @param {1 | -1} direction
     */
    rotate(direction) {
      this.tetromino.shape = this.getRotationShape(direction);
      this.direction = this.getRotateDirection(direction);
    }

    /**
     * @param {1 | -1} direction
     */
    getRotationShape(direction) {
      return Array.from({ length: this.tetromino.shape.length }, ((_row, rowIndex) => (
        Array.from({ length: this.tetromino.width }, (_block, colIndex) => (
          direction === 1
            ? this.tetromino.shape[this.tetromino.height - colIndex - 1][rowIndex]
            : this.tetromino.shape[colIndex][this.tetromino.width - rowIndex - 1]
        ))
      )));
    }
  }

  /**
   * @typedef {{ placedBlocks: PlacedBlocks }} PlacedBlocksProps
   */

  class PlacedBlocks {
    /**
     * @type {CanvasRenderer<PlacedBlocksProps, {}>}
     */
    static Renderer = createRenderer({
      render({ placedBlocks }) {
        return [BlockGroupRenderer({
          shape: placedBlocks.shape,
          x: Field.Renderer.X,
          y: Field.Renderer.Y - FieldBlockRenderer.SIZE * (Field.HEIGHT - Field.VISIBLE_HEIGHT)
        })];
      }
    });

    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
      this.width = width;
      this.height = height;
      /**
       * @type {Shape}
       */
      this.shape = Array.from({ length: this.height }, () => this.createEmptyRow());
    }

    /**
     * @param {Tetromino} tetromino
     * @param {number} x
     * @param {number} y
     * @param {MeltableBlockMeltOptions} meltOptions
     */
    place(tetromino, x, y, meltOptions) {
      this.shape = this.shape.map((row, rowIndex) => (
        row.map((block, colIndex) => {
          const newRow = tetromino.shape[rowIndex - y];
          if (!newRow) {
            return block;
          }
          const newBlock = newRow[colIndex - x];
          if (!newBlock || newBlock.isEmpty) {
            return block;
          }

          const meltableBlock = new MeltableBlock(tetromino.type, meltOptions);
          meltableBlock.startMelt();

          return meltableBlock;
        })
      ));
    }

    deleteRows() {
      let count = 0;
      for (const [completeRowIndex, row] of this.shape.entries()) {
        if (row.some((block) => block.isEmpty)) {
          continue;
        }

        for (const block of row) {
          if (block instanceof MeltableBlock) {
            block.stopMelt();
          }
        }

        for (const rowIndex of [...this.shape.keys()].slice(0, completeRowIndex + 1).reverse()) {
          this.shape[rowIndex] = this.shape[rowIndex - 1] || this.createEmptyRow();
        }
        count++;
      }
      return count;
    }

    createEmptyRow() {
      return Array.from({ length: this.width }, () => new EmptyBlock());
    }

    stopAllMelt() {
      for (const row of this.shape) {
        for (const block of row) {
          if (block instanceof MeltableBlock) {
            block.stopMelt();
          }
        }
      }
    }
  }

  /**
   * @typedef {{ shape: Shape; x: number; y: number; }} GhostBlockProps
   */

  /**
   * @type {CanvasRenderer<GhostBlockProps, {}>}
   */
  const GhostBlockRenderer = createRenderer({
    render({ shape, x, y }) {
      const ghostShape = shape.map((row) => (
        row.map((block) => (
          block.isEmpty
            ? block
            : new Block("#aaa")
        ))
      ));
      return [
        BlockGroupRenderer({ shape: ghostShape, x, y })
      ];
    }
  });

  /**
   * @typedef {{ field: Field }} FieldProps
   */

  /**
   * @typedef {{ X: number; Y: number; }} FieldStatic
   */

  class Field {
    static WIDTH = 10;
    static HEIGHT = 40;
    static VISIBLE_HEIGHT = 20;

    /**
     * @type {CanvasRenderer<FieldProps, FieldStatic>}
     */
    static Renderer = createRenderer({
      render({ field }) {
        const { fieldTetromino } = field;
        const x = Field.Renderer.X;
        const y = Field.Renderer.Y;

        return [
          RectRenderer({
            x,
            y,
            width: FieldBlockRenderer.SIZE * Field.WIDTH,
            height: FieldBlockRenderer.SIZE * Field.VISIBLE_HEIGHT,
            color: "#dfdfdf"
          }),
          GhostBlockRenderer({
            x: x + FieldBlockRenderer.SIZE * fieldTetromino.fieldX,
            y: y + FieldBlockRenderer.SIZE * (field.getHardDropPosition() - (Field.HEIGHT - Field.VISIBLE_HEIGHT)),
            shape: fieldTetromino.tetromino.shape
          }),
          FieldTetromino.Renderer({ fieldTetromino: fieldTetromino }),
          PlacedBlocks.Renderer({ placedBlocks: field.placed })
        ];
      },

      static: {
        X: 300,
        Y: 150
      }
    });

    static BASIC_SRS_RULE_SETS = {
      "1": [
        [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]
      ],
      "-1": [
        [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
      ],
    };

    static I_TYPE_SRS_RULE_SETS = {
      "1": [
        [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
        [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
        [[0, 0], [2, 0], [1, 0], [2, -1], [-1, 2]],
        [[0, 0], [1, 0], [2, 0], [1, 2], [-2, -1]]
      ],
      "-1": [
        [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
        [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
        [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
        [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
      ]
    };

    placed = new PlacedBlocks(Field.WIDTH, Field.HEIGHT);

    /**
     * @param {FieldTetromino} defaultFieldTetromino
     */
    constructor(defaultFieldTetromino) {
      this.fieldTetromino = defaultFieldTetromino;
    }

    /**
     * @param {Shape} shape
     * @param {number} x
     * @param {number} y
     */
    canPlaceShape(shape, x, y) {
      return shape.every((row, rowIndex) => (
        row.every((block, colIndex) => {
          if (block.isEmpty) {
            return true;
          }

          const placedRow = this.placed.shape[y + rowIndex];
          if (!placedRow) {
            return false;
          }
          const placedBlock = placedRow[x + colIndex];
          if (!placedBlock) {
            return false;
          }
          return placedBlock.isEmpty;
        })
      ));
    }

    /**
     * @param {number} moveX
     * @param {number} moveY
     */
    moveTetromino(moveX, moveY) {
      const canMove = this.canPlaceShape(
        this.fieldTetromino.tetromino.shape,
        this.fieldTetromino.fieldX + moveX,
        this.fieldTetromino.fieldY + moveY
      );
      if (canMove) {
        this.fieldTetromino.move(moveX, moveY);
      }
      return canMove;
    }

    /**
     * @param {1 | -1} direction
     */
    rotateTetromino(direction) {
      const srsRuleSets = this.fieldTetromino.tetromino.type === "I"
        ? Field.I_TYPE_SRS_RULE_SETS
        : Field.BASIC_SRS_RULE_SETS;
      const ruleSet = srsRuleSets[direction][this.fieldTetromino.direction];
      const rotatedShape = this.fieldTetromino.getRotationShape(direction);
      for (const [ruleX, ruleY] of ruleSet) {
        if (this.canPlaceShape(
          rotatedShape,
          this.fieldTetromino.fieldX + ruleX,
          this.fieldTetromino.fieldY + ruleY
        )) {
          this.fieldTetromino.move(ruleX, ruleY);
          this.fieldTetromino.rotate(direction);
          return true;
        }
      }
      return false;
    }

    getHardDropPosition() {
      let i = 0;
      while (this.canPlaceShape(
        this.fieldTetromino.tetromino.shape,
        this.fieldTetromino.fieldX,
        this.fieldTetromino.fieldY + i
      )) {
        i++;
      }
      return this.fieldTetromino.fieldY + i - 1;
    }
  }

  /**
   * @typedef {{ nextTetrominoList: NextTetrominoesList }} NextTetrominoListProps
   */

  class NextTetrominoesList {
    /**
     * @type {CanvasRenderer<NextTetrominoListProps, {}>}
     */
    static Renderer = createRenderer({
      render({ nextTetrominoList }) {
        const x = Field.Renderer.X + FieldBlockRenderer.SIZE * Field.WIDTH;
        const y = Field.Renderer.Y;
        return nextTetrominoList.tetrominoes.map((tetromino, index) => (
          BlockGroupRenderer({
            shape: tetromino.shape,
            x: x + FieldBlockRenderer.SIZE * (5 - tetromino.width) / 2,
            y: y + index * FieldBlockRenderer.SIZE * 5 + FieldBlockRenderer.SIZE * (5 - tetromino.height) / 2
          })
        ));
      }
    });

    /**
     * @param {Tetromino[]} defaultTetrominoes
     */
    constructor(defaultTetrominoes) {
      this.tetrominoes = defaultTetrominoes;
      if (this.tetrominoes.length < 1) {
        throw new TypeError("Argument defaultTetrominoes must has element.");
      }
    }

    /**
     * @param {Tetromino} newTetromino
     */
    shift(newTetromino) {
      this.tetrominoes.push(newTetromino);
      const oldTetromino = this.tetrominoes.shift();
      if (!oldTetromino) {
        throw new TypeError("tetrominoes has no element");
      }
      return oldTetromino;
    }
  }

  /**
   * @typedef {{
   *   score: number;
   *   level: number;
   *   lines: number;
   *   combo: number;
   *   timeLeft: number;
   * }} GameData
   */

  /**
   * @typedef {{ gameData: GameData }} GameDataProps
   */

  /**
   * @typedef {{ X: number; Y: number; WIDTH: number }} GameDataStatic
   */

  /**
   * @type {CanvasRenderer<GameDataProps, GameDataStatic>}
   */
  const GameDataRenderer = createRenderer({
    render({ gameData }) {
      const color = "#8ac";
      return Object.entries(gameData).flatMap(([key, value], index) => {
        const x = GameDataRenderer.X;
        const y = GameDataRenderer.Y + index * 150;
        return [
          TextRenderer({
            text: String(key).replace(/[A-Z]/g, " $&").toUpperCase(),
            x,
            y,
            size: 42,
            color
          }),
          TextRenderer({
            text: String(value),
            x: x + GameDataRenderer.WIDTH,
            y: y + 65,
            size: 47,
            align: "right",
            color
          })
        ];
      });
    },

    static: {
      X: 50,
      Y: 500,
      WIDTH: 180
    }
  });

  /**
   * @typedef {{ lockDelay: LockDelay }} LockDelayProps
   */

  /**
   * @typedef {{ HEIGHT: number }} LockDelayStatic
   */

  class LockDelay {
    /**
     * @type {CanvasRenderer<LockDelayProps, LockDelayStatic>}
     */
    static Renderer = createRenderer({
      render({ lockDelay }) {
        if (!lockDelay.isActivated) {
          return;
        }
        const x = Field.Renderer.X;
        const y = Field.Renderer.Y + (FieldBlockRenderer.SIZE * Field.VISIBLE_HEIGHT);
        const progress = (performance.now() - lockDelay.startTime) / LockDelay.DELAY;
        const width = FieldBlockRenderer.SIZE * Field.WIDTH * progress;
        return [
          RectRenderer({ x, y, width, height: LockDelay.Renderer.HEIGHT, color: "#8ac" })
        ];
      },

      static: {
        HEIGHT: 30
      }
    });

    static DELAY = 500;

    isActivated = false;
    startTime = 0;
    onEnded = new OriginalEvent((dispatchAll) => {
      this.handleEnded = dispatchAll;
    });
    timeout = new Timeout(() => {
      this.inactivate();
      this.handleEnded?.();
    });

    set() {
      this.isActivated = true;
      this.startTime = performance.now();
      this.timeout.start(LockDelay.DELAY);
    }

    inactivate() {
      this.isActivated = false;
      this.timeout.cancel();
    }
  }

  /**
   * @typedef {{ holder: Holder }} HolderProps
   */

  /**
   * @typedef {{ X: number; Y: number }} HolderStatic
   */

  class Holder {
    /**
     * @type {CanvasRenderer<HolderProps, HolderStatic>}
     */
    static Renderer = createRenderer({
      render({ holder }, ctx) {
        if (!holder.tetromino) {
          return;
        }

        const size = FieldBlockRenderer.SIZE * 5;

        const x = Holder.Renderer.X + (size - FieldBlockRenderer.SIZE * holder.tetromino.width) / 2;
        const y = Holder.Renderer.Y + (size - FieldBlockRenderer.SIZE * holder.tetromino.height) / 2;

        return [
          BlockGroupRenderer({ shape: holder.tetromino.shape, x, y }),
          ...holder.active
            ? []
            : [CircleRenderer({
              x: Holder.Renderer.X + size - 40,
              y: Holder.Renderer.Y + size - 40,
              radius: 20,
              color: "#f00"
            })]
        ];
      },

      static: {
        X: 50,
        Y: 150
      }
    });

    /**
     * @type {Tetromino | null}
     */
    tetromino = null;

    active = true;

    /**
     * @param {Tetromino} newTetromino
     */
    hold(newTetromino) {
      const heldTetromino = this.tetromino;
      this.tetromino = newTetromino;
      this.tetromino.shape = this.tetromino.getInitialShape();
      this.active = false;
      return heldTetromino;
    }

    activate() {
      this.active = true;
    }
  }

  /**
   * @typedef {{
   *   lines: number;
   *   combo: number;
   *   level: number;
   * }} ScoreCalculationData
   */

  /**
   * @typedef {{
   *   score: number;
   *   lines: number;
   *   time: number;
   * }} GameResult
   */

  /**
   * @typedef {{ game: Game }} GameProps
   */

  class Game {
    /**
     * @type {CanvasRenderer<GameProps, {}>}
     */
    static Renderer = createRenderer({
      render({ game }) {
        return [
          RectRenderer({
            x: 0,
            y: 0,
            width: Tetris.Renderer.WIDTH,
            height: Tetris.Renderer.HEIGHT,
            color: "#f5f5f5"
          }),
          Field.Renderer({ field: game.field }),
          GameDataRenderer({ gameData: game.gameData }),
          LockDelay.Renderer({ lockDelay: game.lockDelay }),
          NextTetrominoesList.Renderer({ nextTetrominoList: game.nextTetrominoes }),
          Holder.Renderer({ holder: game.holder })
        ];
      }
    });

    static MAX_TIME = 300;

    field = new Field(new FieldTetromino(Tetromino.random(), (Field.HEIGHT - Field.VISIBLE_HEIGHT - 2)));
    nextTetrominoes = new NextTetrominoesList(Array.from({ length: 3 }, () => Tetromino.random()));
    lockDelay = new LockDelay();
    holder = new Holder();

    /**
     * @type {GameData}
     */
    gameData = {
      level: 1,
      score: 0,
      lines: 0,
      combo: -1,
      timeLeft: Game.MAX_TIME
    };

    movingDownInterval = new Interval(() => {
      this.moveFieldTetromino(0, 1);
    });

    timeInterval = new Interval(() => {
      this.gameData.timeLeft--;
      if (this.gameData.timeLeft === 0) {
        this.timeInterval.stop();
        this.endGame();
      }
    });

    /**
     * @type {OriginalEvent<[GameResult], void>}
     */
    onGameOver = new OriginalEvent((dispatchAll) => {
      this.handleGameOver = () => dispatchAll({
        score: this.gameData.score,
        lines: this.gameData.lines,
        time: Game.MAX_TIME - this.gameData.timeLeft
      });
    });

    start() {
      this.setMovingDownInterval();
      this.timeInterval.start(1000);

      this.listeners = [
        onKeyDown.addListener((e) => {
          if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
            e.preventDefault();
          }

          if (e.repeat) {
            return;
          }
          switch (e.code) {
            case "KeyX":
            case "ArrowUp":
              this.rotateFieldTetromino(1);
              break;
            case "KeyZ":
              this.rotateFieldTetromino(-1);
              break;
            case "Space":
              this.moveFieldTetromino(0, this.field.getHardDropPosition() - this.field.fieldTetromino.fieldY, true);
              break;
            case "KeyC":
              if (this.holder.active) {
                const heldTetromino = this.holder.hold(this.field.fieldTetromino.tetromino);
                if (heldTetromino) {
                  this.setFieldTetromino(heldTetromino);
                } else {
                  this.setNextTetromino();
                }
              }
              break;
          }
        }),

        onKeyDownRepeat.addListener((e) => {
          if (e.code === "ArrowDown") {
            this.moveFieldTetromino(0, 1);
          }
        }, { repeat: 50 }),

        onKeyDownRepeat.addListener((e) => {
          switch (e.code) {
            case "ArrowLeft":
              this.moveFieldTetromino(-1, 0);
              break;
            case "ArrowRight":
              this.moveFieldTetromino(1, 0);
              break;
          }
        }, { delay: 300, repeat: 50 }),

        this.lockDelay.onEnded.addListener(() => {
          this.afterReachBottom();
        })
      ];
    }

    reset() {
      if (this.listeners) {
        for (const listener of this.listeners) {
          listener.remove();
        }
      }
      this.timeInterval.stop();
      this.movingDownInterval.stop();
      this.lockDelay.inactivate();
      this.field.placed.stopAllMelt();
    }

    setMovingDownInterval() {
      const { level } = this.gameData;
      this.movingDownInterval.start(Math.pow(0.8 - ((level - 1) * 0.007), level - 1) * 1000);
    }

    /**
     * @param {number} moveX
     * @param {number} moveY
     * @param {boolean} instant
     */
    moveFieldTetromino(moveX, moveY, instant = false) {
      const result = this.field.moveTetromino(moveX, moveY);
      if (result) {
        this.handleActField(instant);
      }
      return result;
    }

    /**
     * @param {1 | -1} direction
     */
    rotateFieldTetromino(direction) {
      const result = this.field.rotateTetromino(direction);
      if (result) {
        this.handleActField();
      }
      return result;
    }

    /**
     * @param {boolean} instant
     */
    handleActField(instant = false) {
      if (instant) {
        this.lockDelay.inactivate();
        this.afterReachBottom();
        return;
      }

      const { fieldTetromino } = this.field;

      const canMoveDown = this.field.canPlaceShape(
        fieldTetromino.tetromino.shape,
        fieldTetromino.fieldX,
        fieldTetromino.fieldY + 1
      );
      if (!canMoveDown) {
        this.lockDelay.set();
      } else {
        this.lockDelay.inactivate();
      }
    }

    afterReachBottom() {
      const { fieldTetromino } = this.field;
      const { level } = this.gameData;
      this.field.placed.place(
        fieldTetromino.tetromino,
        fieldTetromino.fieldX,
        fieldTetromino.fieldY,
        {
          iceToMiddle: {
            base: 5,
            range: Math.max(Math.pow(1 - level * 0.01, level) * 20, 5)
          },
          middleToWater: {
            base: 3,
            range: Math.max(Math.pow(1 - level * 0.01, level) * 15, 3)
          }
        }
      );

      const deletedLines = this.field.placed.deleteRows();

      this.gameData.combo = deletedLines > 0
        ? this.gameData.combo + 1
        : -1;

      const score = this.calculateScore({
        lines: deletedLines,
        combo: this.gameData.combo,
        level: this.gameData.level
      });

      this.gameData.score += score;
      this.gameData.lines += deletedLines;
      this.gameData.level = Math.floor(this.gameData.lines / 10 + 1);

      if (this.isGameOver()) {
        this.endGame();
        return;
      }

      this.holder.activate();
      this.setMovingDownInterval();
      this.setNextTetromino();
    }

    endGame() {
      this.reset();
      this.handleGameOver?.();
    }

    calculateScore(/** @type {ScoreCalculationData} */ { lines, combo, level }) {
      let score = 0;

      switch (lines) {
        case 1:
          score = 100;
          break;
        case 2:
          score = 300;
          break;
        case 3:
          score = 500;
          break;
        case 4:
          score = 800;
          break;
      }

      score *= level;

      if (combo > 0) {
        score += combo * 50;
      }

      return score;
    }

    isGameOver() {
      const baseX = Math.floor((Field.WIDTH + 4) / 2 - 4);
      const baseY = Field.HEIGHT - Field.VISIBLE_HEIGHT - 2;

      for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
        for (let colIndex = 0; colIndex < 4; colIndex++) {
          if (!this.field.placed.shape[baseY + rowIndex][baseX + colIndex].isEmpty) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * @param {Tetromino} tetromino
     */
    setFieldTetromino(tetromino) {
      this.field.fieldTetromino = new FieldTetromino(tetromino, Field.HEIGHT - Field.VISIBLE_HEIGHT - 2);
      this.handleActField();
    }

    setNextTetromino() {
      const newTetromino = this.nextTetrominoes.shift(Tetromino.random());
      this.setFieldTetromino(newTetromino);
    }
  }

  class StartScreen {
    /**
     * @type {CanvasRenderer<void, {}>}
     */
    static Renderer = createRenderer({
      render() {
        const logoY = 100;
        const logoSize = 800;

        return [
          RectRenderer({
            x: 0,
            y: 0,
            width: Tetris.Renderer.WIDTH,
            height: Tetris.Renderer.HEIGHT,
            color: "#f5f5f5"
          }),
          ImageRenderer({
            image: images.misc.logo,
            x: (Tetris.Renderer.WIDTH - logoSize) / 2,
            y: logoY,
            width: logoSize,
            height: logoSize
          }),
          TextRenderer({
            text: "Click or press enter to start",
            x: Tetris.Renderer.WIDTH / 2,
            y: logoSize + logoY + 200,
            size: 80,
            color: "#8ac",
            align: "center"
          })
        ];
      }
    });

    /**
     * @param {CanvasEvents} canvasEvents
     */
    constructor(canvasEvents) {
      this.canvasEvents = canvasEvents;
    }

    onStartGame = new OriginalEvent((dispatchAll) => {
      this.handleStartGame = dispatchAll;
    });

    start() {
      this.listeners = [
        onKeyDown.addListener((e) => {
          if (["Enter"].includes(e.code)) {
            this.endStartScreen();
          }
        }),

        this.canvasEvents.onClick.addListener(() => {
          this.endStartScreen();
        })
      ];
    }

    endStartScreen() {
      this.reset();
      this.handleStartGame?.();
    }

    reset() {
      if (this.listeners) {
        for (const listener of this.listeners) {
          listener.remove();
        }
      }
    }
  }

  /**
   * @typedef {{ gameOverScreen: GameOverScreen }} GameOverScreenProps
   */

  /**
   * @typedef {{
   *   canvasEvents: CanvasEvents,
   *   gameResult: GameResult
   * }} GameOverScreenOptions
   */

  class GameOverScreen {
    /**
     * @type {CanvasRenderer<GameOverScreenProps, {}>}
     */
    static Renderer = createRenderer({
      render({ gameOverScreen }) {
        const { gameResult } = gameOverScreen;

        const centerTextProps = /** @type {const} */ ({
          x: Tetris.Renderer.WIDTH / 2,
          color: "#8ac",
          align: "center"
        });

        return [
          RectRenderer({
            x: 0,
            y: 0,
            width: Tetris.Renderer.WIDTH,
            height: Tetris.Renderer.HEIGHT,
            color: "#f5f5f5"
          }),
          TextRenderer({
            ...centerTextProps,
            text: "Game Over",
            y: 200,
            size: 100,
          }),
          TextRenderer({
            ...centerTextProps,
            text: String(gameResult.score),
            y: 475,
            size: 150,
          }),
          TextRenderer({
            ...centerTextProps,
            text: `Time: ${gameResult.time}`,
            y: 650,
            size: 60,
          }),
          TextRenderer({
            ...centerTextProps,
            text: `Lines: ${gameResult.lines}`,
            y: 750,
            size: 60,
          }),
          TextRenderer({
            ...centerTextProps,
            text: "Click or press enter to restart",
            y: 1100,
            size: 80,
          })
        ];
      }
    });

    constructor(/** @type {GameOverScreenOptions} */ { canvasEvents, gameResult }) {
      this.canvasEvents = canvasEvents;
      this.gameResult = gameResult;
    }

    onRestartGame = new OriginalEvent((dispatchAll) => {
      this.handleRestartGame = dispatchAll;
    });

    start() {
      this.listeners = [
        onKeyDown.addListener((e) => {
          if (["Enter"].includes(e.code)) {
            this.endGameOverScreen();
          }
        }),

        this.canvasEvents.onClick.addListener(() => {
          this.endGameOverScreen();
        })
      ];
    }

    endGameOverScreen() {
      this.reset();
      this.handleRestartGame?.();
    }

    reset() {
      if (this.listeners) {
        for (const listener of this.listeners) {
          listener.remove();
        }
      }
    }
  }

  /**
   * @typedef {{
   *   onClick: OriginalEvent<[MouseEvent], void>
   * }} CanvasEvents
   */

  /**
   * @typedef {"PREPARATION" | "START_SCREEN" | "GAME" | "GAME_OVER_SCREEN"} TetrisScreen
   */

  /**
   * @typedef {{ tetris: Tetris }} TetrisProps
   */

  /**
   * @typedef {{ WIDTH: number; HEIGHT: number }} TetrisStatic
   */

  class Tetris {
    /**
     * @type {CanvasRenderer<TetrisProps, TetrisStatic>}
     */
    static Renderer = createRenderer({
      render({ tetris }) {
        const { screen, game, gameOverScreen } = tetris;
        switch (screen) {
          case "PREPARATION":
            return [
              TextRenderer({
                text: "Preparation",
                x: Tetris.Renderer.WIDTH / 2,
                y: Tetris.Renderer.HEIGHT / 2,
                size: 50,
                color: "#8ac",
                align: "center"
              })
            ];
          case "START_SCREEN":
            return [
              StartScreen.Renderer()
            ];
          case "GAME":
            if (!game) {
              throw new TypeError("tetris.game is undefined");
            }
            return [
              Game.Renderer({ game })
            ];
          case "GAME_OVER_SCREEN":
            if (!gameOverScreen) {
              throw new TypeError("tetris.gameOverScreen is undefined");
            }
            return [
              GameOverScreen.Renderer({ gameOverScreen })
            ];
          default:
            throw new TypeError("Invalid state.");
        }
      },

      static: {
        WIDTH: 1100,
        HEIGHT: 1300
      }
    });

    /**
     * @type {CanvasEvents}
     */
    canvasEvents = {
      onClick: new OriginalEvent((dispatchAll) => {
        this.canvas.addEventListener("click", dispatchAll);
      })
    };

    /**
     * @type {TetrisScreen}
     */
    screen = "PREPARATION";

    /**
     * @param {ParentNode} canvasWrapper
     */
    constructor(canvasWrapper) {
      this.canvasWrapper = canvasWrapper;
      this.canvas = document.createElement("canvas");
      this.canvas.width = Tetris.Renderer.WIDTH;
      this.canvas.height = Tetris.Renderer.HEIGHT;
    }

    start() {
      this.canvasWrapper.replaceChildren(this.canvas);

      const root = new Root(this.canvas);
      root.setUp(() => Tetris.Renderer({
        tetris: this
      }));

      this.startStartScreen();
    }

    startStartScreen() {
      this.screen = "START_SCREEN";
      this.startScreen = new StartScreen(this.canvasEvents);

      this.startScreen.onStartGame.addListener(() => {
        this.startGame();
      });

      this.startScreen.start();
    }

    startGame() {
      this.screen = "GAME";
      this.game = new Game();

      this.game.onGameOver.addListener((gameResult) => {
        this.startGameOverScreen(gameResult);
      });

      this.game.start();
    }

    /**
     * @param {GameResult} gameResult
     */
    startGameOverScreen(gameResult) {
      this.screen = "GAME_OVER_SCREEN";
      this.gameOverScreen = new GameOverScreen({ canvasEvents: this.canvasEvents, gameResult });

      this.gameOverScreen.onRestartGame.addListener(() => {
        this.startGame();
      });

      this.gameOverScreen.start();
    }
  }

  const canvasWrapper = document.getElementById("tetris");
  if (!canvasWrapper) {
    throw new TypeError("Cannot find element #tetris");
  }
  try {
    new Tetris(canvasWrapper).start();
  } catch (e) {
    console.error(e);
    canvasWrapper.replaceChildren("An error occurred during preparation.")
  }
})();
