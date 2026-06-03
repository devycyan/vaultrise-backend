/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vaultrise.json`.
 */
export type Vaultrise = {
  "address": "3GDAw4cHZ9a5GdF8hXjiKwHmrMzESAG3NgtMgks3ffJd",
  "metadata": {
    "name": "vaultrise",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Vaultrise lending protocol — borrow USDC against graduated PumpSwap tokens"
  },
  "instructions": [
    {
      "name": "addToken",
      "discriminator": [
        237,
        255,
        26,
        54,
        56,
        48,
        68,
        52
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "oracle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxLtvBps",
          "type": "u16"
        },
        {
          "name": "pumpswapPool",
          "type": "pubkey"
        },
        {
          "name": "stalenessSecs",
          "type": "u32"
        }
      ]
    },
    {
      "name": "applyLtvBoost",
      "discriminator": [
        1,
        219,
        81,
        210,
        67,
        22,
        195,
        220
      ],
      "accounts": [
        {
          "name": "borrower",
          "writable": true,
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "vriseMint",
          "writable": true
        },
        {
          "name": "borrowerVrise",
          "writable": true
        },
        {
          "name": "vriseTokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "lender",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "gusdcMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  115,
                  100,
                  99,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "lenderUsdc",
          "writable": true
        },
        {
          "name": "lenderGusdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "lender"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "gusdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint",
          "docs": [
            "USDC mint (its token program is passed as `token_program`)."
          ]
        },
        {
          "name": "gusdcMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  115,
                  100,
                  99,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "insuranceVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "feeRecipient",
          "docs": [
            "USDC token account that receives protocol fees."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program that owns the USDC mint (SPL Token on mainnet)."
          ]
        }
      ],
      "args": [
        {
          "name": "oracleUpdater",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "liquidate",
      "discriminator": [
        223,
        179,
        226,
        125,
        48,
        46,
        39,
        74
      ],
      "accounts": [
        {
          "name": "liquidator",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "tokenConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "oracle",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "position.borrower",
                "account": "userPosition"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "position.borrower",
                "account": "userPosition"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "liquidatorUsdc",
          "writable": true
        },
        {
          "name": "liquidatorCollateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "liquidator"
              },
              {
                "kind": "account",
                "path": "collateralTokenProgram"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "insuranceVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "liquidatorRegistry",
          "docs": [
            "Optional: a priority-liquidator registration grants a higher bonus."
          ],
          "optional": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "repayAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "openPosition",
      "discriminator": [
        135,
        128,
        47,
        77,
        15,
        152,
        240,
        49
      ],
      "accounts": [
        {
          "name": "borrower",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "tokenConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "oracle",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "borrowerCollateral",
          "writable": true
        },
        {
          "name": "borrowerUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "feeRecipient",
          "writable": true
        },
        {
          "name": "vriseMint",
          "writable": true,
          "optional": true
        },
        {
          "name": "borrowerVrise",
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Token program owning USDC/gUSDC (SPL Token on mainnet)."
          ]
        },
        {
          "name": "collateralTokenProgram",
          "docs": [
            "Token program owning the collateral mint (Token-2022 for pump.fun tokens)."
          ]
        },
        {
          "name": "vriseTokenProgram",
          "docs": [
            "Token program owning $VRISE (only needed with the boost)."
          ],
          "optional": true
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "collateralAmount",
          "type": "u64"
        },
        {
          "name": "borrowAmount",
          "type": "u64"
        },
        {
          "name": "useVriseBoost",
          "type": "bool"
        }
      ]
    },
    {
      "name": "proposeToken",
      "discriminator": [
        13,
        41,
        189,
        251,
        229,
        155,
        239,
        136
      ],
      "accounts": [
        {
          "name": "proposer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vriseMint",
          "writable": true
        },
        {
          "name": "proposerVrise",
          "writable": true
        },
        {
          "name": "vriseTokenProgram"
        }
      ],
      "args": [
        {
          "name": "proposedMint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "registerLiquidator",
      "discriminator": [
        178,
        113,
        103,
        117,
        248,
        144,
        91,
        160
      ],
      "accounts": [
        {
          "name": "liquidator",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "liquidator"
              }
            ]
          }
        },
        {
          "name": "vriseMint",
          "writable": true
        },
        {
          "name": "liquidatorVrise",
          "writable": true
        },
        {
          "name": "vriseTokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "repay",
      "discriminator": [
        234,
        103,
        67,
        82,
        208,
        234,
        219,
        166
      ],
      "accounts": [
        {
          "name": "borrower",
          "writable": true,
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "borrowerCollateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "collateralTokenProgram"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "borrowerUsdc",
          "writable": true
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "vriseMint",
          "writable": true,
          "optional": true
        },
        {
          "name": "borrowerVrise",
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "vriseTokenProgram",
          "optional": true
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "repayAmount",
          "type": "u64"
        },
        {
          "name": "useVriseDiscount",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setLpBlocked",
      "discriminator": [
        255,
        124,
        169,
        60,
        73,
        4,
        130,
        228
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "tokenConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "token_config.mint",
                "account": "tokenConfig"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "blocked",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setPaused",
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setVriseMint",
      "docs": [
        "Set the $VRISE mint after the token launches (enables burn/boost ops)."
      ],
      "discriminator": [
        87,
        113,
        48,
        75,
        35,
        102,
        13,
        128
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vriseMint"
        }
      ],
      "args": []
    },
    {
      "name": "subscribeShield",
      "discriminator": [
        137,
        142,
        64,
        65,
        195,
        243,
        22,
        23
      ],
      "accounts": [
        {
          "name": "borrower",
          "writable": true,
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "vriseMint",
          "writable": true
        },
        {
          "name": "borrowerVrise",
          "writable": true
        },
        {
          "name": "vriseTokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "updatePrice",
      "discriminator": [
        61,
        34,
        117,
        155,
        75,
        34,
        123,
        208
      ],
      "accounts": [
        {
          "name": "updater",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "oracle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "oracle.mint",
                "account": "oraclePrice"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateToken",
      "discriminator": [
        92,
        200,
        25,
        239,
        138,
        254,
        58,
        102
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "tokenConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "token_config.mint",
                "account": "tokenConfig"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "enabled",
          "type": "bool"
        },
        {
          "name": "maxLtvBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "lender",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "gusdcMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  115,
                  100,
                  99,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "usdcVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  99,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "lenderUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "lender"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lenderGusdc",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gusdcAmount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "liquidatorRegistry",
      "discriminator": [
        31,
        109,
        154,
        197,
        24,
        216,
        56,
        169
      ]
    },
    {
      "name": "oraclePrice",
      "discriminator": [
        71,
        166,
        229,
        21,
        54,
        247,
        8,
        34
      ]
    },
    {
      "name": "protocolConfig",
      "discriminator": [
        207,
        91,
        250,
        28,
        152,
        179,
        215,
        209
      ]
    },
    {
      "name": "reservePool",
      "discriminator": [
        42,
        167,
        10,
        179,
        94,
        197,
        213,
        74
      ]
    },
    {
      "name": "tokenConfig",
      "discriminator": [
        92,
        73,
        255,
        43,
        107,
        51,
        117,
        101
      ]
    },
    {
      "name": "userPosition",
      "discriminator": [
        251,
        248,
        209,
        245,
        83,
        234,
        17,
        27
      ]
    }
  ],
  "events": [
    {
      "name": "borrowEvent",
      "discriminator": [
        86,
        8,
        140,
        206,
        215,
        179,
        118,
        201
      ]
    },
    {
      "name": "burnEvent",
      "discriminator": [
        33,
        89,
        47,
        117,
        82,
        124,
        238,
        250
      ]
    },
    {
      "name": "depositEvent",
      "discriminator": [
        120,
        248,
        61,
        83,
        31,
        142,
        107,
        144
      ]
    },
    {
      "name": "liquidateEvent",
      "discriminator": [
        158,
        94,
        144,
        4,
        147,
        52,
        5,
        255
      ]
    },
    {
      "name": "priceUpdateEvent",
      "discriminator": [
        176,
        152,
        211,
        252,
        92,
        105,
        194,
        103
      ]
    },
    {
      "name": "repayEvent",
      "discriminator": [
        129,
        213,
        0,
        108,
        218,
        108,
        82,
        140
      ]
    },
    {
      "name": "tokenProposedEvent",
      "discriminator": [
        200,
        63,
        76,
        0,
        194,
        149,
        61,
        129
      ]
    },
    {
      "name": "vriseMintSetEvent",
      "discriminator": [
        156,
        225,
        186,
        98,
        138,
        171,
        167,
        6
      ]
    },
    {
      "name": "withdrawEvent",
      "discriminator": [
        22,
        9,
        133,
        26,
        160,
        44,
        71,
        192
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "protocolPaused",
      "msg": "Protocol is paused"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "Unauthorized: signer is not the protocol authority"
    },
    {
      "code": 6002,
      "name": "unauthorizedOracleUpdater",
      "msg": "Unauthorized: signer is not the oracle updater"
    },
    {
      "code": 6003,
      "name": "tokenDisabled",
      "msg": "Collateral token is not enabled"
    },
    {
      "code": 6004,
      "name": "tokenLpBlocked",
      "msg": "Collateral token is blocked due to LP concentration risk"
    },
    {
      "code": 6005,
      "name": "staleOraclePrice",
      "msg": "Oracle price is stale"
    },
    {
      "code": 6006,
      "name": "invalidOraclePrice",
      "msg": "Oracle price is zero or uninitialized"
    },
    {
      "code": 6007,
      "name": "loanBelowMinimum",
      "msg": "Loan amount is below the protocol minimum"
    },
    {
      "code": 6008,
      "name": "loanAboveMaximum",
      "msg": "Loan amount exceeds the protocol maximum"
    },
    {
      "code": 6009,
      "name": "exceedsMaxLtv",
      "msg": "Requested borrow exceeds the maximum allowed by LTV"
    },
    {
      "code": 6010,
      "name": "positionAlreadyOpen",
      "msg": "Position already has an open loan"
    },
    {
      "code": 6011,
      "name": "noOutstandingDebt",
      "msg": "Position has no outstanding debt"
    },
    {
      "code": 6012,
      "name": "insufficientLiquidity",
      "msg": "Not enough available liquidity in the lending pool"
    },
    {
      "code": 6013,
      "name": "positionHealthy",
      "msg": "Health Factor is at or above 1.0; position is not liquidatable"
    },
    {
      "code": 6014,
      "name": "shieldGraceActive",
      "msg": "Liquidation shield grace period is active"
    },
    {
      "code": 6015,
      "name": "zeroAmount",
      "msg": "Repay amount must be greater than zero"
    },
    {
      "code": 6016,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6017,
      "name": "mintMismatch",
      "msg": "Provided mint does not match the configured mint"
    },
    {
      "code": 6018,
      "name": "vriseNotSet",
      "msg": "The $VRISE mint has not been set yet (admin must call set_vrise_mint)"
    },
    {
      "code": 6019,
      "name": "boostStillActive",
      "msg": "LTV boost is still active"
    },
    {
      "code": 6020,
      "name": "collateralRemaining",
      "msg": "Collateral remaining in escrow; cannot close position"
    }
  ],
  "types": [
    {
      "name": "borrowEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "collateralMint",
            "type": "pubkey"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "borrowedAmount",
            "type": "u64"
          },
          {
            "name": "protocolFee",
            "type": "u64"
          },
          {
            "name": "usedVriseBoost",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "burnEvent",
      "docs": [
        "Emitted on every $VRISE burn, regardless of which operation triggered it.",
        "`operation` values: 0=open,1=ltv_boost,2=shield,3=repay_discount,4=priority_liquidator,5=whitelist_vote."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "operation",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "depositEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lender",
            "type": "pubkey"
          },
          {
            "name": "usdcAmount",
            "type": "u64"
          },
          {
            "name": "gusdcMinted",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "liquidateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "liquidator",
            "type": "pubkey"
          },
          {
            "name": "collateralMint",
            "type": "pubkey"
          },
          {
            "name": "debtRepaid",
            "type": "u64"
          },
          {
            "name": "collateralSeized",
            "type": "u64"
          },
          {
            "name": "liquidatorBonusBps",
            "type": "u16"
          },
          {
            "name": "insuranceAmount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "liquidatorRegistry",
      "docs": [
        "Registered \"priority\" liquidator. PDA seeds: [b\"liquidator\", liquidator]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "liquidator",
            "type": "pubkey"
          },
          {
            "name": "bonusBps",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "oraclePrice",
      "docs": [
        "Per-collateral-mint price feed. PDA seeds: [b\"oracle\", mint]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "price",
            "docs": [
              "USDC (6 decimals) per 1 whole collateral token."
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "stalenessSecs",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "priceUpdateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collateralMint",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "protocolConfig",
      "docs": [
        "Global singleton. Holds authorities, configured mints, and protocol-wide flags.",
        "PDA seeds: [b\"config\"]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Authority allowed to run admin instructions (add tokens, pause, etc.)."
            ],
            "type": "pubkey"
          },
          {
            "name": "oracleUpdater",
            "docs": [
              "Trusted signer allowed to push oracle price updates."
            ],
            "type": "pubkey"
          },
          {
            "name": "feeRecipient",
            "docs": [
              "Receives the protocol fee charged at borrow time."
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "docs": [
              "The USDC mint used for lending/borrowing."
            ],
            "type": "pubkey"
          },
          {
            "name": "vriseMint",
            "docs": [
              "The $VRISE mint burned by boost operations."
            ],
            "type": "pubkey"
          },
          {
            "name": "vriseDecimals",
            "docs": [
              "Decimals of the $VRISE mint (used to scale whole-token burn amounts)."
            ],
            "type": "u8"
          },
          {
            "name": "paused",
            "docs": [
              "When true, state-changing user instructions are blocked."
            ],
            "type": "bool"
          },
          {
            "name": "totalVriseBurned",
            "docs": [
              "Lifetime $VRISE burned (raw base units), for the public burn tracker."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "repayEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "collateralMint",
            "type": "pubkey"
          },
          {
            "name": "repaidAmount",
            "type": "u64"
          },
          {
            "name": "interestDiscount",
            "type": "u64"
          },
          {
            "name": "collateralReturned",
            "type": "u64"
          },
          {
            "name": "fullyClosed",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "reservePool",
      "docs": [
        "The single USDC lending reserve. PDA seeds: [b\"reserve\"]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usdcVault",
            "docs": [
              "Token account holding lender USDC liquidity (authority = config PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "insuranceVault",
            "docs": [
              "Token account holding the insurance fund in USDC (authority = config PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "gusdcMint",
            "docs": [
              "gUSDC receipt mint (mint authority = config PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "totalDebtScaled",
            "docs": [
              "Sum of all positions' normalized debt (WAD-scaled). Current total debt =",
              "total_debt_scaled * cumulative_borrow_index / WAD."
            ],
            "type": "u128"
          },
          {
            "name": "cumulativeBorrowIndex",
            "docs": [
              "Cumulative borrow index (WAD). Starts at WAD (== 1.0) and only grows."
            ],
            "type": "u128"
          },
          {
            "name": "lastAccruedTs",
            "docs": [
              "Unix timestamp of the last interest accrual."
            ],
            "type": "i64"
          },
          {
            "name": "insuranceFund",
            "docs": [
              "Insurance fund balance mirror (USDC base units)."
            ],
            "type": "u64"
          },
          {
            "name": "totalLoansOpened",
            "docs": [
              "Lifetime number of loans opened."
            ],
            "type": "u64"
          },
          {
            "name": "totalLiquidations",
            "docs": [
              "Lifetime number of liquidations."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tokenConfig",
      "docs": [
        "Per-collateral-mint configuration. PDA seeds: [b\"token\", mint]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "maxLtvBps",
            "type": "u16"
          },
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "lpBlocked",
            "docs": [
              "Set by the off-chain LP-concentration checker when top-3 holders > 60%."
            ],
            "type": "bool"
          },
          {
            "name": "pumpswapPool",
            "docs": [
              "The PumpSwap pool address backing this token's price (reference only)."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tokenProposedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "proposedMint",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userPosition",
      "docs": [
        "A borrower's position for a single collateral mint.",
        "PDA seeds: [b\"position\", borrower, collateral_mint]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "collateralMint",
            "type": "pubkey"
          },
          {
            "name": "collateralAmount",
            "docs": [
              "Collateral locked in the escrow token account (base units)."
            ],
            "type": "u64"
          },
          {
            "name": "debtScaled",
            "docs": [
              "Normalized debt (WAD). Current debt = debt_scaled * index / WAD."
            ],
            "type": "u128"
          },
          {
            "name": "principal",
            "docs": [
              "Outstanding principal (USDC base units), excludes accrued interest."
            ],
            "type": "u64"
          },
          {
            "name": "maxLtvBps",
            "docs": [
              "The max LTV granted to this position (2000 standard, 2500 with open-boost)."
            ],
            "type": "u16"
          },
          {
            "name": "ltvBoostExpiry",
            "docs": [
              "Expiry of a temporary LTV boost (0 = none)."
            ],
            "type": "i64"
          },
          {
            "name": "shieldExpiry",
            "docs": [
              "Expiry of the liquidation-shield subscription (0 = none)."
            ],
            "type": "i64"
          },
          {
            "name": "graceStartedAt",
            "docs": [
              "When the shield grace period was first tripped by a liquidation attempt",
              "(0 = not tripped). Liquidation is allowed once SHIELD_GRACE_SECS elapse."
            ],
            "type": "i64"
          },
          {
            "name": "openedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vriseMintSetEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vriseMint",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "withdrawEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lender",
            "type": "pubkey"
          },
          {
            "name": "gusdcBurned",
            "type": "u64"
          },
          {
            "name": "usdcAmount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
