/**
 * Error Handling Utilities für API-Calls
 */

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

export class ApiErrorHandler {
  /**
   * Parst API-Fehler und gibt benutzerfreundliche Nachricht zurück
   */
  static parseError(error: unknown): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
      };
    }

    return {
      message: 'Ein unbekannter Fehler ist aufgetreten',
    };
  }

  /**
   * Validiert Response und wirft Fehler wenn nicht ok
   */
  static async validateResponse(response: Response): Promise<any> {
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}` };
      }

      const error: ApiError = {
        message: errorData.error || `HTTP ${response.status}`,
        status: response.status,
        details: errorData,
      };

      throw error;
    }

    return response.json();
  }

  /**
   * Validiert erforderliche Felder
   */
  static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter((field) => !data[field]);

    if (missing.length > 0) {
      throw new Error(`Erforderliche Felder fehlen: ${missing.join(', ')}`);
    }
  }

  /**
   * Validiert numerische Werte
   */
  static validateNumber(value: any, fieldName: string, min?: number, max?: number): number {
    const num = parseFloat(value);

    if (isNaN(num)) {
      throw new Error(`${fieldName} muss eine Zahl sein`);
    }

    if (min !== undefined && num < min) {
      throw new Error(`${fieldName} muss mindestens ${min} sein`);
    }

    if (max !== undefined && num > max) {
      throw new Error(`${fieldName} darf maximal ${max} sein`);
    }

    return num;
  }

  /**
   * Validiert Datumsformat
   */
  static validateDate(dateString: string, fieldName: string): Date {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new Error(`${fieldName} muss ein gültiges Datum sein`);
    }

    return date;
  }

  /**
   * Validiert dass Zahl größer als 0 ist
   */
  static validatePositive(value: any, fieldName: string): number {
    const num = this.validateNumber(value, fieldName, 0.01);
    return num;
  }
}

/**
 * Retry-Logik für fehlgeschlagene Requests
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // Nur bei 5xx Fehlern retry, nicht bei 4xx
      if (response.status >= 500 && i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}
