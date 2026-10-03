import 'package:flutter_test/flutter_test.dart';
import 'package:muanoluxe_studio/main.dart';
void main() {
  test('Production studio requires HTTPS; loopback development is allowed', () {
    expect(isAllowedStudioUrl(Uri.parse('https://muanoluxe.web.app/admin')), isTrue);
    expect(isAllowedStudioUrl(Uri.parse('http://127.0.0.1:5173/admin')), isTrue);
    expect(isAllowedStudioUrl(Uri.parse('http://example.com/admin')), isFalse);
    expect(isAllowedStudioUrl(Uri.parse('file:///secrets')), isFalse);
    expect(isAllowedStudioUrl(Uri.parse('javascript:alert(1)')), isFalse);
  });
}
