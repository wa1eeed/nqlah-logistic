import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/router.dart';
import 'core/theme/app_theme.dart';

/// Root app. Arabic-first, RTL by default (handoff §4), light + dark themes
/// from the design tokens, routed with GoRouter.
class NqApp extends StatelessWidget {
  const NqApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
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
      routerConfig: router,
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child!,
      ),
    );
  }
}
