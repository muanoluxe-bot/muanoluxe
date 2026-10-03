import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:local_notifier/local_notifier.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_windows/webview_windows.dart';

const configuredUrl = String.fromEnvironment('STORE_URL');
bool isAllowedStudioUrl(Uri uri) => uri.scheme == 'https' || (uri.scheme == 'http' && (uri.host == '127.0.0.1' || uri.host == 'localhost'));

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const StudioApp());
}
class StudioApp extends StatelessWidget {
  const StudioApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'MuanoLuxe Studio', debugShowCheckedModeBanner: false,
    theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff667451)), scaffoldBackgroundColor: const Color(0xfff3f4ee), useMaterial3: true),
    home: const StudioWindow(),
  );
}
class StudioWindow extends StatefulWidget {
  const StudioWindow({super.key});
  @override
  State<StudioWindow> createState() => _StudioWindowState();
}
class _StudioWindowState extends State<StudioWindow> {
  final controller = WebviewController();
  final subscriptions = <StreamSubscription<dynamic>>[];
  HttpServer? server;
  String? error;
  Uri? studioUri;
  String currentUrl = '';
  bool ready = false, alerts = false, busy = true;
  @override
  void initState() { super.initState(); initialize(); }
  Future<Uri> localPreview() async {
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    server!.listen((request) async {
      if (!['GET', 'HEAD'].contains(request.method)) { request.response.statusCode = 405; await request.response.close(); return; }
      var path = request.uri.path;
      if (path.contains('..') || path.contains('\\')) { request.response.statusCode = 403; await request.response.close(); return; }
      if (path == '/' || path == '/admin' || !path.split('/').last.contains('.')) { path = '/index.html'; }
      try {
        final bytes = await rootBundle.load('assets/site$path');
        final ext = path.split('.').last;
        request.response.headers.contentType = ContentType.parse(switch(ext) { 'html' => 'text/html; charset=utf-8', 'js' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8', 'png' => 'image/png', 'svg' => 'image/svg+xml', 'webp' => 'image/webp', _ => 'application/octet-stream' });
        request.response.headers.set('X-Content-Type-Options', 'nosniff');
        if (request.method == 'GET') { request.response.add(bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes)); }
      } catch (_) { request.response.statusCode = 404; }
      await request.response.close();
    });
    return Uri.parse('http://127.0.0.1:${server!.port}/admin?desktop=1');
  }
  Future<void> initialize() async {
    try {
      studioUri = configuredUrl.isEmpty ? await localPreview() : Uri.parse(configuredUrl);
      if (!isAllowedStudioUrl(studioUri!)) { throw StateError('Use an HTTPS studio address. HTTP is supported only for localhost previews.'); }
      await controller.initialize();
      await controller.setBackgroundColor(const Color(0xfff3f4ee));
      await controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.deny);
      subscriptions.add(controller.url.listen((url) { currentUrl = url; }));
      subscriptions.add(controller.loadingState.listen((state) { if (mounted) { setState(() => busy = state == LoadingState.loading); } }));
      subscriptions.add(controller.webMessage.listen((message) async {
        if (!alerts || studioUri == null) { return; }
        final source = Uri.tryParse(currentUrl);
        if (source?.origin != studioUri!.origin || !source!.path.startsWith('/admin')) { return; }
        try {
          final data = message is String ? jsonDecode(message) : message;
          if (data is! Map || data['type'] != 'notification' || data['title'] is! String || data['body'] is! String) { return; }
          final title = (data['title'] as String), body = (data['body'] as String);
          if (title.length > 160 || body.length > 500) { return; }
          await LocalNotification(title: title, body: body).show();
        } catch (_) { /* The persistent studio feed remains available if Windows alerts fail. */ }
      }));
      final uri = studioUri!.replace(queryParameters: {...studioUri!.queryParameters, 'desktop':'1'});
      await controller.loadUrl(uri.toString());
      if (mounted) { setState(() { ready = true; error = null; }); }
    } catch (e) { if (mounted) { setState(() { error = 'The studio could not open. Make sure Microsoft Edge WebView2 Runtime is installed, then reopen the app.\n\n$e'; busy = false; }); } }
  }
  Future<void> toggleAlerts() async {
    if (alerts) { setState(() => alerts = false); return; }
    try {
      await localNotifier.setup(appName: 'MuanoLuxe Studio', shortcutPolicy: ShortcutPolicy.requireCreate);
      setState(() => alerts = true);
      await LocalNotification(title: 'MuanoLuxe Studio', body: 'Order and subscriber alerts are enabled while the studio is open.').show();
    } catch (_) { if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Windows notifications could not be enabled. Your studio activity feed is still available.'))); } }
  }
  @override
  void dispose() { for (final s in subscriptions) { s.cancel(); } controller.dispose(); server?.close(force: true); super.dispose(); }
  @override
  Widget build(BuildContext context) => Scaffold(
    body: Column(children: [
      Container(height: 48, padding: const EdgeInsets.symmetric(horizontal: 18), color: const Color(0xff283023), child: Row(children: [
        const Text('MUANOLUXE  /  STUDIO', style: TextStyle(color: Color(0xffeff1e9), fontSize: 11, letterSpacing: 2)),
        const Spacer(),
        Text(configuredUrl.isEmpty ? 'LOCAL PREVIEW' : 'CONNECTED WORKSPACE', style: const TextStyle(color: Color(0xffaeb89e), fontSize: 9, letterSpacing: 1)),
        const SizedBox(width: 16),
        IconButton(tooltip: alerts ? 'Disable Windows alerts' : 'Enable Windows alerts', onPressed: toggleAlerts, icon: Icon(alerts ? Icons.notifications_active_outlined : Icons.notifications_none, color: const Color(0xffd8e0cb), size: 19)),
        IconButton(tooltip: 'Reload studio', onPressed: ready ? () => controller.reload() : null, icon: const Icon(Icons.refresh, color: Color(0xffd8e0cb), size: 19)),
        IconButton(tooltip: 'Open in your browser (Google sign-in supported)', onPressed: studioUri == null ? null : () => launchUrl(studioUri!, mode: LaunchMode.externalApplication), icon: const Icon(Icons.open_in_new, color: Color(0xffd8e0cb), size: 18)),
      ])),
      if (busy) const LinearProgressIndicator(minHeight: 2, color: Color(0xff879875), backgroundColor: Color(0xffe8ecdf)),
      Expanded(child: error != null ? Center(child: Container(constraints: const BoxConstraints(maxWidth: 550), padding: const EdgeInsets.all(32), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.window_outlined, size: 42), const SizedBox(height: 24), const Text('Let’s open your studio.', style: TextStyle(fontSize: 28)), const SizedBox(height: 20), Text(error!, textAlign: TextAlign.center), const SizedBox(height: 20), TextButton(onPressed: () => launchUrl(Uri.parse('https://developer.microsoft.com/microsoft-edge/webview2/'), mode: LaunchMode.externalApplication), child: const Text('Get Microsoft Edge WebView2'))]))) : ready ? Webview(controller, permissionRequested: (url, kind, initiated) async => WebviewPermissionDecision.deny) : const Center(child: CircularProgressIndicator())),
      Container(height: 25, alignment: Alignment.center, child: const Text('Live alerts require the studio to stay open. Staff email sign-in is available in the app; use your browser for Google sign-in.', style: TextStyle(fontSize: 9, color: Color(0xff8a947c)))),
    ]),
  );
}
