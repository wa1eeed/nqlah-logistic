import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/theme/app_theme.dart';
import 'features/gallery/gallery_screen.dart';

/// Root app. Arabic-first, RTL by default (handoff §4), light + dark themes
/// from the design tokens. Routing (GoRouter) + the policy-driven shell land
/// in Phase 1; for now the home is the design-system gallery.
class NqApp extends StatelessWidget {
  const NqApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'نقلة',
      debugShowCheckedModeBanner: false,
      theme: NqTheme.light(),
      darkTheme: NqTheme.dark(),
      themeMode: ThemeMode.system,
      locale: const Locale('ar', 'SA'),
      supportedLocales: const [Locale('ar', 'SA'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child!,
      ),
      home: const GalleryScreen(),
    );
  }
}
