// @ts-check

/**
 * @todo Tetromino設置
 * @todo 行を削除
 * @todo 点数
 * @todo 画像
 * @todo 次のTetromino
 * @todo Lock Delay
 * @todo Hold
 * @todo エフェクト
 * @todo ボタン
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
      if (!e.repeat) {
        prevKeyDownEvent = e;
      }
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
   * @typedef {{ x: number, y: number, shape: (Block | EmptyBlock)[][] }} BlockGroupRendererProps
   */

  const BlockGroupRenderer = createRenderer({
    render(/** @type BlockGroupRendererProps */ { shape: blocksShape, x, y }) {
      const blocks = blocksShape.flatMap((row, rowIndex) => (
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
        shape: [[0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]],
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

    static random() {
      const random = Math.floor(Math.random() * this.SHAPES.size);
      return new Tetromino([...this.SHAPES.keys()][random]);
    }

    /**
     * @param {string} type
     */
    constructor(type) {
      const tetrominoData = Tetromino.SHAPES.get(type);
      if (!tetrominoData) {
        throw new TypeError("Invalid argument type");
      }

      this.type = type;
      this.color = tetrominoData.color;
      this.shape = tetrominoData.shape.map((
        (row) => row.map((isEmpty) => isEmpty ? new Block(this.color) : new EmptyBlock())
      ));
      this.width = Math.max(...this.shape.map(row => row.length));
      this.height = this.shape.length;
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
        return 0 + direction;
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
          y: Field.Renderer.Y
        })];
      }
    });

    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
      /**
       * @type {(Block | EmptyBlock)[][]}
       */
      this.shape = Array.from({ length: height }, () => (
        Array.from({ length: width }, () => new EmptyBlock())
      ));
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

    static basicSRSRuleSets = {
      "1": [
        [
          [0, 0],
          [-1, 0],
          [-1, 1],
          [0, -2],
          [-1, -2]
        ],
        [
          [0, 0],
          [-1, 0],
          [-1, -1],
          [0, 2],
          [-1, 2]
        ],
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, -2],
          [1, -2]
        ],
        [
          [0, 0],
          [1, 0],
          [1, -1],
          [0, 2],
          [1, 2]
        ]
      ],
      "-1": [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, -2],
          [1, -2]
        ],
        [
          [0, 0],
          [-1, 0],
          [-1, -1],
          [0, 2],
          [-1, 2]
        ],
        [
          [0, 0],
          [-1, 0],
          [-1, 1],
          [0, -2],
          [-1, -2]
        ],
        [
          [0, 0],
          [1, 0],
          [1, -1],
          [0, 2],
          [1, 2]
        ]
      ]
    };

    static iTypeSRSRuleSets = {
      "1": [
        [
          [0, 0],
          [1, 0],
          [-2, 0],
          [1, 2],
          [-2, -1]
        ],
        [
          [0, 0],
          [-2, 0],
          [1, 0],
          [-2, 1],
          [1, -2]
        ],
        [
          [0, 0],
          [-1, 0],
          [2, 0],
          [-1, -2],
          [2, 1]
        ],
        [
          [0, 0],
          [2, 0],
          [-1, 0],
          [2, -1],
          [-1, 2]
        ]
      ],
      "-1": [
        [
          [0, 0],
          [2, 0],
          [-1, 0],
          [2, -1],
          [-1, 2]
        ],
        [
          [0, 0],
          [1, 0],
          [-2, 0],
          [1, 2],
          [-2, -1]
        ],
        [
          [0, 0],
          [-2, 0],
          [1, 0],
          [-2, 1],
          [1, -2]
        ],
        [
          [0, 0],
          [-1, 0],
          [2, 0],
          [-1, -2],
          [2, 1]
        ]
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
     * @param {(Block | EmptyBlock)[][]} shape
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
        ? Field.iTypeSRSRuleSets
        : Field.basicSRSRuleSets;
      const ruleSet = srsRuleSets[direction][this.fieldTetromino.getRotateDirection(direction)];
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
   * @typedef {{ gameData: GameData }} GameDataProps
   */

  class GameData {
    static Renderer = createRenderer({
      render(/** @type {GameDataProps} */ { gameData }, ctx) {
        ctx.fillText(String(gameData.level), GameData.Renderer.X, GameData.Renderer.Y);
      },

      static: {
        X: 20,
        Y: 600
      }
    });

    level = 1;
  }

  /**
   * @typedef {{ game: Game }} GameProps
   */

  class Game {
    static Renderer = createRenderer({
      render(/** @type {GameProps} */ { game }) {
        return [
          Field.Renderer({ field: game.field }),
          GameData.Renderer({ gameData: game.gameData })
        ];
      },

      static: {
        WIDTH: 1100,
        HEIGHT: 1500
      }
    });

    field = new Field(new FieldTetromino(Tetromino.random(), (Field.HEIGHT - Field.VISIBLE_HEIGHT - 2)));
    gameData = new GameData();

    start() {
      this.tetrominoInterval = new Interval(() => {
        this.field.moveTetromino(0, 1);
      });
      this.tetrominoInterval.start(Math.pow(0.8 - ((this.gameData.level - 1) * 0.007), this.gameData.level - 1) * 1000);

      onKeyDown.addListener((e) => {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
          e.preventDefault();
        }

        if (e.repeat) {
          e.preventDefault();
        }
        switch (e.code) {
          case "KeyX":
          case "ArrowUp":
            this.field.rotateTetromino(1);
            break;
          case "KeyZ":
            this.field.rotateTetromino(-1);
            break;
          case "Space":
            // hardDrop
            break;
          case "KeyC":
            // hold
            break;
        }
      });

      onKeyDownRepeat.addListener((e) => {
        if (e.code === "ArrowDown") {
          this.field.moveTetromino(0, 1);
        }
      }, { repeat: 50 });

      onKeyDownRepeat.addListener((e) => {
        switch (e.code) {
          case "ArrowLeft":
            this.field.moveTetromino(-1, 0);
            break;
          case "ArrowRight":
            this.field.moveTetromino(1, 0);
            break;
        }
      }, { delay: 300, repeat: 50 });
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
