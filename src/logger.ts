import { Injectable } from "@nestjs/common";

@Injectable()
export class Logger {
    private getTimestamp(): string {
        return new Date().toISOString();
    }

    verbose(message: string, object?: any) {
        console.log(`[VERBOSE] ${this.getTimestamp()} - ${message}`, object || "");
    }

    debug(message: string, object?: any) {
        console.log(`[DEBUG] ${this.getTimestamp()} - ${message}`, object || "");
    }

    log(message: string, object?: any) {
        console.log(`[LOG] ${this.getTimestamp()} - ${message}`, object || "");
    }

    warn(message: string, object?: any) {
        console.warn(`[WARN] ${this.getTimestamp()} - ${message}`, object || "");
    }

    error(message: string, object?: any) {
        console.error(`[ERROR] ${this.getTimestamp()} - ${message}`, object || "");
    }

    critical(message: string, object?: any) {
        console.error(`[CRITICAL] ${this.getTimestamp()} - ${message}`, object || "");
    }
}
