// @ts-check

/**
 * @todo 点数
 * @todo 画像
 * @todo エフェクト
 * @todo ボタン
 * @todo downする時間
 * @todo 削除修正
 * @todo 影
 */

(() => {
  "use strict";

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
   */
  class OriginalEventHandler {
    /**
     * @param {(...eventArgs: EVENTS) => void} handler
     */
    constructor(handler) {
      this.handler = handler;
    }

    /**
     * @param {EVENTS} eventArgs
     */
    dispatch = (...eventArgs) => {
      this.handler(...eventArgs);
    };
  }

  /**
   * @template {any[]} EVENTS
   * @template {object | void} OPTIONS
   */
  class OriginalEvent {
    /**
     * @type {Set<OriginalEventHandler<EVENTS>}
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
     * @param {(...eventArgs: EVENTS) => void} handlerFn
     * @param {OPTIONS} options
     */
    addListener(handlerFn, options) {
      if (!this.initCalled) {
        this.afterEventAdded = this.init(this.dispatchAll);
        this.initCalled = true;
      }

      const handler = new OriginalEventHandler(handlerFn);

      this.afterEventAdded?.(options, handler.dispatch);

      this.handlers.add(handler);
    }

    /**
     * @param  {EVENTS} eventArgs
     * @private
     */
    dispatchAll = (...eventArgs) => {
      for (const handler of this.handlers) {
        handler.dispatch(...eventArgs);
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
   * @typedef {{ block: Block; x: number; y: number; }} BlockProps
   */

  /**
   * @implements {FieldBlock}
   */
  class Block {
    static Renderer = createRenderer({
      render(/** @type {BlockProps} */ { block, x, y }, ctx) {
        ctx.fillStyle = block.color;
        ctx.fillRect(x, y, Block.Renderer.SIZE, Block.Renderer.SIZE);
      },

      static: {
        SIZE: 50
      }
    });

    /**
     * @readonly
     */
    isEmpty = false;

    /**
     * @param {string} color
     */
    constructor(color) {
      this.color = color;
    }
  }

  /**
   * @typedef {(Block | EmptyBlock)[][]} Shape
   */

  /**
   * @typedef {{ x: number, y: number, shape: Shape }} BlockGroupProps
   */

  const BlockGroupRenderer = createRenderer({
    render(/** @type {BlockGroupProps} */ { shape, x, y }) {
      const blocks = shape.flatMap((row, rowIndex) => (
        row.flatMap((block, colIndex) => (
          block.isEmpty
            ? []
            : [Block.Renderer({
              block,
              x: x + colIndex * Block.Renderer.SIZE,
              y: y + rowIndex * Block.Renderer.SIZE
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
    static Renderer = createRenderer({
      render(/** @type {TetrominoProps} */ { tetromino, x, y }) {
        return [BlockGroupRenderer({
          shape: tetromino.shape,
          x,
          y
        })];
      }
    });

    static SHAPES = new Map([
      ["I", {
        shape: [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        color: "#0ff"
      }],
      ["O", {
        shape: [
          [1, 1],
          [1, 1]
        ], color: "#ff0"
      }],
      ["S", {
        shape: [
          [0, 1, 1],
          [1, 1, 0],
          [0, 0, 0]
        ], color: "#0f0"
      }],
      ["Z", {
        shape: [
          [1, 1, 0],
          [0, 1, 1],
          [0, 0, 0]
        ], color: "#f00"
      }],
      ["J", {
        shape: [
          [1, 0, 0],
          [1, 1, 1],
          [0, 0, 0]
        ], color: "#00f"
      }],
      ["L", {
        shape: [
          [0, 0, 1],
          [1, 1, 1],
          [0, 0, 0]
        ], color: "#ff7f00"
      }],
      ["T", {
        shape: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0]
        ], color: "#f0f"
      }]
    ]);

    static usedNumbers = new Set();

    static random() {
      if (this.usedNumbers.size === 7) {
        this.usedNumbers.clear();
      }

      while (true) {
        const tempRandom = Math.floor(Math.random() * 7);
        if (!this.usedNumbers.has(tempRandom)) {
          this.usedNumbers.add(tempRandom);
          return new Tetromino([...this.SHAPES.keys()][tempRandom]);
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
      const tetrominoData = Tetromino.SHAPES.get(this.type);
      if (!tetrominoData) {
        throw new TypeError("Invalid argument type.");
      }
      return tetrominoData.shape.map((
        (row) => row.map((isEmpty) => isEmpty ? new Block(tetrominoData.color) : new EmptyBlock())
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
      render(/** @type {FieldTetrominoProps} */ { fieldTetromino }) {
        const tetrominoX = Field.Renderer.X + (Block.Renderer.SIZE * fieldTetromino.fieldX);
        const tetrominoY = Field.Renderer.Y + (Block.Renderer.SIZE * (fieldTetromino.fieldY - Field.VISIBLE_HEIGHT));
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
      render(/** @type {PlacedBlocksProps} */ { placedBlocks }) {
        return [BlockGroupRenderer({
          shape: placedBlocks.shape,
          x: Field.Renderer.X,
          y: Field.Renderer.Y - Block.Renderer.SIZE * (Field.HEIGHT - Field.VISIBLE_HEIGHT)
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
     */
    place(tetromino, x, y) {
      this.shape = this.shape.map((row, rowIndex) => (
        row.map((block, colIndex) => {
          const newRow = tetromino.shape[rowIndex - y];
          if (!newRow) {
            return block;
          }
          const newBlock = newRow[colIndex - x];
          if (!newBlock) {
            return block;
          }
          return newBlock.isEmpty ? block : newBlock;
        })
      ));
    }

    deleteRows() {
      let count = 0;
      for (const [completeRowIndex, row] of this.shape.entries()) {
        if (row.some((block) => block.isEmpty)) {
          continue;
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
  }

  /**
   * @typedef {{ field: Field }} FieldProps
   */

  class Field {
    static WIDTH = 10;
    static HEIGHT = 40;
    static VISIBLE_HEIGHT = 20;

    static Renderer = createRenderer({
      render(/** @type {FieldProps} */ { field }, ctx) {
        ctx.fillStyle = "#dfdfdf";
        const x = Field.Renderer.X;
        const y = Field.Renderer.Y;
        ctx.fillRect(x, y, Block.Renderer.SIZE * Field.WIDTH, Block.Renderer.SIZE * Field.VISIBLE_HEIGHT);

        return [
          FieldTetromino.Renderer({ fieldTetromino: field.fieldTetromino }),
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

    static I_TYPE_SRC_RULE_SETS = {
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
        ? Field.I_TYPE_SRC_RULE_SETS
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
  }

  /**
   * @typedef {{ nextTetrominoList: NextTetrominoesList }} NextTetrominoListProps
   */

  class NextTetrominoesList {
    static Renderer = createRenderer({
      render(/** @type {NextTetrominoListProps} */ { nextTetrominoList }) {
        const x = Field.Renderer.X + Block.Renderer.SIZE * Field.WIDTH;
        const y = Field.Renderer.Y;
        return nextTetrominoList.tetrominoes.map((tetromino, index) => (
          BlockGroupRenderer({
            shape: tetromino.shape,
            x: x + Block.Renderer.SIZE * (5 - tetromino.width) / 2,
            y: y + index * Block.Renderer.SIZE * 5 + Block.Renderer.SIZE * (5 - tetromino.height) / 2
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
   * }} GameData
   */

  /**
   * @typedef {{ gameData: GameData }} GameDataProps
   */

  const GameDataRenderer = createRenderer({
    render(/** @type {GameDataProps} */ { gameData }, ctx) {
      ctx.fillStyle = "#666";
      for (const [index, [key, value]] of Object.entries(gameData).entries()) {
        const x = GameDataRenderer.X;
        const y = GameDataRenderer.Y + index * 150;
        ctx.font = "40px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(String(key), x, y);
        ctx.font = "45px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(value), x + GameDataRenderer.WIDTH, y + 60);
      }
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

  class LockDelay {
    static Renderer = createRenderer({
      render(/** @type {LockDelayProps} */ { lockDelay }, ctx) {
        if (!lockDelay.isActivated) {
          return;
        }
        const x = Field.Renderer.X;
        const y = Field.Renderer.Y + (Block.Renderer.SIZE * Field.VISIBLE_HEIGHT);
        const progress = (performance.now() - lockDelay.startTime) / LockDelay.DELAY;
        const width = Block.Renderer.SIZE * Field.WIDTH * progress;
        ctx.fillStyle = "#8ac";
        ctx.fillRect(x, y, width, LockDelay.Renderer.HEIGHT);
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

  class Holder {
    static Renderer = createRenderer({
      render(/** @type {HolderProps} */ { holder }, ctx) {
        if (!holder.tetromino) {
          return;
        }

        const size = Block.Renderer.SIZE * 5;

        if (!holder.active) {
          ctx.fillStyle = "#f00";
          ctx.arc(Holder.Renderer.X + size - 40, Holder.Renderer.Y + size - 40, 20, 0, Math.PI * 2);
          ctx.fill();
        }

        /**
         * @type {number}
         */
        const x = Holder.Renderer.X + (size - Block.Renderer.SIZE * holder.tetromino.width) / 2;
        /**
         * @type {number}
         */
        const y = Holder.Renderer.Y + (size - Block.Renderer.SIZE * holder.tetromino.height) / 2;

        return [BlockGroupRenderer({ shape: holder.tetromino.shape, x, y })];
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
   * @typedef {{ game: Game }} GameProps
   */

  class Game {
    static Renderer = createRenderer({
      render(/** @type {GameProps} */ { game }) {
        return [
          Field.Renderer({ field: game.field }),
          GameDataRenderer({ gameData: game.gameData }),
          LockDelay.Renderer({ lockDelay: game.lockDelay }),
          NextTetrominoesList.Renderer({ nextTetrominoList: game.nextTetrominoes }),
          Holder.Renderer({ holder: game.holder })
        ];
      },

      static: {
        WIDTH: 1100,
        HEIGHT: 1500
      }
    });

    field = new Field(new FieldTetromino(Tetromino.random(), (Field.HEIGHT - Field.VISIBLE_HEIGHT - 2)));
    nextTetrominoes = new NextTetrominoesList(Array.from({ length: 3 }, () => Tetromino.random()));
    /**
     * @type {GameData}
     */
    gameData = {
      level: 1,
      score: 0,
      lines: 0
    };
    lockDelay = new LockDelay();
    holder = new Holder();

    movingDownInterval = new Interval(() => {
      this.moveFieldTetromino(0, 1);
    });

    start() {
      this.setMovingDownInterval();

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
            // hardDrop
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
      });

      onKeyDownRepeat.addListener((e) => {
        if (e.code === "ArrowDown") {
          this.moveFieldTetromino(0, 1);
        }
      }, { repeat: 50 });

      onKeyDownRepeat.addListener((e) => {
        switch (e.code) {
          case "ArrowLeft":
            this.moveFieldTetromino(-1, 0);
            break;
          case "ArrowRight":
            this.moveFieldTetromino(1, 0);
            break;
        }
      }, { delay: 300, repeat: 50 });

      this.lockDelay.onEnded.addListener(() => {
        this.afterReachBottom();
      });
    }

    setMovingDownInterval() {
      this.movingDownInterval.start(Math.pow(0.8 - ((this.gameData.level - 1) * 0.007), this.gameData.level - 1) * 1000);
    }

    /**
     * @param {number} moveX
     * @param {number} moveY
     */
    moveFieldTetromino(moveX, moveY) {
      const result = this.field.moveTetromino(moveX, moveY);
      if (result) {
        this.handleActField();
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

    handleActField() {
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
      this.field.placed.place(fieldTetromino.tetromino, fieldTetromino.fieldX, fieldTetromino.fieldY);
      const deletedRows = this.field.placed.deleteRows();

      let score = 0;
      switch (deletedRows) {
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
      this.gameData.score += score;
      this.gameData.lines += deletedRows;
      this.gameData.level = Math.floor(this.gameData.lines / 10 + 1);

      this.holder.activate();
      this.setMovingDownInterval();
      this.setNextTetromino();
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

  /**
   * @typedef {{ tetris: Tetris }} TetrisProps
   */

  class Tetris {
    static Renderer = createRenderer({
      render(/** @type {TetrisProps} */ { tetris }) {
        return [
          Game.Renderer({ game: tetris.game })
        ];
      },

      static: {
        WIDTH: 1100,
        HEIGHT: 1500
      }
    });

    game = new Game();

    /**
     * @param {ParentNode} canvasWrapper
     */
    constructor(canvasWrapper) {
      this.canvasWrapper = canvasWrapper;
    }

    start() {
      const canvas = document.createElement("canvas");
      canvas.width = Tetris.Renderer.WIDTH;
      canvas.height = Tetris.Renderer.HEIGHT;
      this.canvasWrapper.replaceChildren(canvas);

      const root = new Root(canvas);
      root.setUp(() => Tetris.Renderer({
        tetris: this
      }));

      this.game.start();
    }
  }

  const canvasWrapper = document.getElementById("tetris");
  if (!canvasWrapper) {
    throw new TypeError("Cannot find element #tetris");
  }
  new Tetris(canvasWrapper).start();
})();
