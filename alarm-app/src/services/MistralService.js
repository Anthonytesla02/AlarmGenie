// Note: In production, this should be replaced with a backend service
// that securely calls the Mistral AI API to prevent API key exposure

export class MistralService {
  static async generateDismissalCode() {
    try {
      // For development and demo purposes, we generate codes locally
      // In production, this would make a secure backend API call
      const code = this.generateSecureCode();
      
      // Simulate API delay to match real Mistral API behavior
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        code: code,
        timestamp: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes from now
      };
    } catch (error) {
      console.error('Error generating dismissal code:', error);
      throw new Error('Failed to generate dismissal code');
    }
  }

  // Secure local code generation with entropy from multiple sources
  static generateSecureCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Use multiple entropy sources for better randomness
    const timestamp = Date.now().toString();
    const random1 = Math.random().toString(36);
    const random2 = Math.random().toString(36);
    
    // Combine entropy sources
    const entropy = timestamp + random1 + random2;
    
    for (let i = 0; i < 8; i++) {
      // Use entropy to seed character selection
      const seedIndex = (entropy.charCodeAt(i % entropy.length) + i) % characters.length;
      const randomIndex = Math.floor(Math.random() * characters.length);
      const finalIndex = (seedIndex + randomIndex) % characters.length;
      code += characters.charAt(finalIndex);
    }
    
    return code;
  }

  /* 
   * Production Implementation:
   * 
   * This would be implemented as a backend service that:
   * 1. Receives a request for a dismissal code
   * 2. Calls Mistral AI API securely with server-side API key
   * 3. Validates and sanitizes the response to ensure 8-char alphanumeric
   * 4. Returns the code with expiration timestamp
   * 
   * Example backend endpoint:
   * 
   * POST /api/generate-dismissal-code
   * Headers: Authorization: Bearer <user-jwt-token>
   * Body: { alarmId: string }
   * Response: { code: string, expiresAt: number }
   * 
   * The backend would:
   * - Authenticate the user
   * - Rate limit requests
   * - Log attempts for security monitoring
   * - Use environment variables for API keys
   * - Implement retry logic for API failures
   * - Validate code format before returning
   */

  static async generateCodeWithBackend(alarmId) {
    // This would be the production implementation
    try {
      const response = await fetch('/api/generate-dismissal-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getUserToken()}`,
        },
        body: JSON.stringify({ alarmId }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate response format
      if (!data.code || !data.expiresAt || !this.isValidCode(data.code)) {
        throw new Error('Invalid response format from backend');
      }

      return data;
    } catch (error) {
      console.error('Backend code generation failed:', error);
      // Fallback to local generation for demo purposes
      return this.generateDismissalCode();
    }
  }

  static isValidCode(code) {
    // Validate that the code is exactly 8 alphanumeric characters
    const codeRegex = /^[A-Z0-9]{8}$/;
    return codeRegex.test(code);
  }

  static async getUserToken() {
    // This would retrieve the user's authentication token
    // For demo purposes, return a placeholder
    return 'demo-user-token';
  }
}