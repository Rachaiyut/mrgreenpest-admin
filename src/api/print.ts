import { AuthService } from "./auth";

class PrintService extends AuthService {
	protected path = '/print';

	async getById(id: string) {
		const res = await this.http.get(`${this.path}/${id}/view`, {
			responseType: 'blob',
		});

		const blob = new Blob([res.data], { type: 'application/pdf' });
		const url = window.URL.createObjectURL(blob);
		window.open(url, '_blank');
		window.URL.revokeObjectURL(url);

		return res.data;
	}
}

export const PrintApi = new PrintService();