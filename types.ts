
export interface QueryParam {
  value: string | number | string[];
  type?: string;
}

export interface QueryDefinition {
  sql: string;
  filename: string;
  database: string;
  schema: string;
  table: string;
  parameters: Record<string, QueryParam>;
}

export interface ReportDefinition {
  report: string;
  queries: QueryDefinition[];
}

export interface AccessConfig {
  [region: string]: {
    [env: string]: Record<string, string>;
  };
}

export type Region = "Colombia" | "Perú" | "Argentina" | "España" | "Suiza" | "Nueva York";
export type Environment = "PRE" | "PRO";
export type Client = "Banca March" | "Bankinter" | "BBVA" | "Pichincha";
export type Geography = "Luxemburgo" | "Argentina" | "Suiza" | "Perú" | "Colombia" | "Nueva York" | "España";

// Repository Types
export interface RepositoryFile {
  id: string;
  client: Client;
  geography?: Geography; // Optional, not all clients have geographies
  env: Environment;
  version: number;
  fileName: string;
  content: any; // The JSON content
  uploadedAt: string;
  uploadedBy: string;
  comment: string;
}

export type RepositoryData = Record<string, Record<string, Record<string, RepositoryFile[]>>>; // client -> geography/env -> files

// Client configuration: which geographies each client has
export const CLIENT_GEOGRAPHIES: Record<Client, Geography[] | null> = {
  "Banca March": ["Luxemburgo"],
  "Bankinter": null, // No geographies
  "BBVA": ["Argentina", "Suiza", "Perú", "Colombia", "Nueva York", "España"],
  "Pichincha": null // No geographies
};

// Configuración estricta de bases de datos/proyectos por cliente, geografía (cuando aplique) y entorno
export const EXPECTED_DATABASES: Record<Client, Record<string, Record<Environment, string[]>>> = {
  "Banca March": {
    "Luxemburgo": {
      "PRE": ["pre_banca_march_luxemburgo_alquid"],
      "PRO": ["pro_banca_march_luxemburgo_alquid"]
    }
  },
  "Bankinter": {
    "general": {
      "PRE": ["pre_bankinter_alquid"],
      "PRO": ["pro_bankinter_alquid"]
    }
  },
  "BBVA": {
    "Argentina": {
      "PRE": [
        "pre_bbva_argenti_alquid_archive_xua",
        "pre_bbva_argenti_alquid_xua"
      ],
      "PRO": [
        "pro_bbva_argenti_alquid_archive_qxw",
        "pro_bbva_argenti_alquid_qxw",
        "pro_bbva_argenti_alquid_xua"
      ]
    },
    "Colombia": {
      "PRE": [
        "pre_bbva_colombia_alquid",
        "pre_bbva_colombia_aqluid_archive"
      ],
      "PRO": [
        "pro_bbva_colombia_alquid_3",
        "pro_bbva_colombia_alquid_archive"
      ]
    },
    "Nueva York": {
      "PRE": [
        "pre_bbva_ny_alquid_archive_olm",
        "pre_bbva_ny_alquid_olm"
      ],
      "PRO": [
        "pro_bbva_ny_alquid_archive_qjh",
        "pro_bbva_ny_alquid_qjh"
      ]
    },
    "Perú": {
      "PRE": [
        "pre_bbva_peru_alquid",
        "pre_bbva_peru_alquid_archive"
      ],
      "PRO": [
        "pro_bbva_peru_alquid",
        "pro_bbva_peru_alquid_archive"
      ]
    },
    "Suiza": {
      "PRE": ["sol-pre-suiza-alquid-gc"],
      "PRO": ["sol-pro-suiza-alquid-gc"]
    },
    "España": {
      "PRE": [],
      "PRO": []
    }
  },
  "Pichincha": {
    "general": {
      "PRE": ["pre_pichincha_alquid"],
      "PRO": ["pro_pichincha_alquid"]
    }
  }
};

// Tablas conocidas por base de datos
// Agrupa tablas que pueden existir en las bases ALQUID según el tipo de cliente
export const EXPECTED_TABLES: Record<string, string[]> = {
  // Tablas base ALQUID (comunes a todas las instancias)
  "DEFAULT": [
    "metric",
    "cashflow",
    "result",
    "accounts",
    "transactions",
    "balance",
    "movements",
    "data_extract",
    "staging",
    "archive"
  ],
  // Banca March
  "pre_banca_march_luxemburgo_alquid": [
    "metric", "cashflow", "result", "accounts", "balance", "transactions"
  ],
  "pro_banca_march_luxemburgo_alquid": [
    "metric", "cashflow", "result", "accounts", "balance", "transactions"
  ],
  // Bankinter
  "pre_bankinter_alquid": [
    "metric", "cashflow", "result", "accounts", "balance", "transactions"
  ],
  "pro_bankinter_alquid": [
    "metric", "cashflow", "result", "accounts", "balance", "transactions"
  ],
  // BBVA Argentina
  "pre_bbva_argenti_alquid_xua": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pre_bbva_argenti_alquid_archive_xua": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_bbva_argenti_alquid_qxw": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_bbva_argenti_alquid_archive_qxw": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  // BBVA Colombia
  "pre_bbva_colombia_alquid": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pre_bbva_colombia_aqluid_archive": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_bbva_colombia_alquid_3": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_bbva_colombia_alquid_archive": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  // BBVA Nueva York
  "pre_bbva_ny_alquid_olm": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pre_bbva_ny_alquid_archive_olm": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_bbva_ny_alquid_qjh": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_bbva_ny_alquid_archive_qjh": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  // BBVA Perú
  "pre_bbva_peru_alquid": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pre_bbva_peru_alquid_archive": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_bbva_peru_alquid": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_bbva_peru_alquid_archive": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  // BBVA Suiza
  "sol-pre-suiza-alquid-gc": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "sol-pro-suiza-alquid-gc": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  // Pichincha
  "pre_pichincha_alquid": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ],
  "pro_pichincha_alquid": [
    "metric", "cashflow", "result", "accounts", "transactions", "balance"
  ]
};