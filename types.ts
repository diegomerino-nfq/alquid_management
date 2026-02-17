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

export type Region = "Colombia" | "Perú" | "Argentina" | "España" | "Suiza" | "New York";
export type Environment = "PRE" | "PRO";

// Configuración estricta de bases de datos/proyectos por entorno
export const EXPECTED_DATABASES: Record<string, Record<string, string[]>> = {
  "Argentina": {
    "PRE": ["pre_bbva_argenti_alquid_archive_xua", "pre_bbva_argenti_alquid_xua"],
    "PRO": ["pro_bbva_argenti_alquid_archive_qxw", "pro_bbva_argenti_alquid_qxw"]
  },
  "Colombia": {
    "PRE": ["pre_bbva_colombia_alquid", "pre_bbva_colombia_aqluid_archive"], // Nota: 'aqluid' según imagen
    "PRO": ["pro_bbva_colombia_alquid_3", "pro_bbva_colombia_alquid_archive"]
  },
  "New York": {
    "PRE": ["pre_bbva_ny_alquid_archive_olm", "pre_bbva_ny_alquid_olm"],
    "PRO": ["pro_bbva_ny_alquid_archive_qjh", "pro_bbva_ny_alquid_qjh"]
  },
  "Perú": {
    "PRE": ["pre_bbva_peru_alquid", "pre_bbva_peru_alquid_archive"],
    "PRO": ["pro_bbva_peru_alquid", "pro_bbva_peru_alquid_archive"]
  },
  "Suiza": {
    "PRE": ["sol-pre-suiza-alquid-gc"],
    "PRO": ["sol-pro-suiza-alquid-gc"]
  },
  "España": {
    "PRE": [], 
    "PRO": []
  }
};