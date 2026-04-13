import { AuthService } from "./auth";

class PrintService extends AuthService {
	protected path = '/print';

	async getById(id: string): Promise<Blob> {
		const res = await this.http.get(`${this.path}/${id}/view`, {
			responseType: 'blob',
		});

		return new Blob([res.data], { type: 'application/pdf' });
	}
}

export const PrintApi = new PrintService();