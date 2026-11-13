import 'package:flutter/material.dart';
import 'package:slideforge_mobile/auth/app_state_store.dart';
import 'package:slideforge_mobile/auth/auth_gate.dart';
import 'package:slideforge_mobile/auth/auth_repository.dart';
import 'package:slideforge_mobile/presentations/presentation_repository.dart';

void main() {
  runApp(const SlideforgeApp());
}

class SlideforgeApp extends StatelessWidget {
  const SlideforgeApp({
    super.key,
    this.authRepository,
    this.presentationRepository,
    this.appStateStore,
  });

  final AuthRepository? authRepository;
  final PresentationRepository? presentationRepository;
  final MobileAppStateStore? appStateStore;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Slideforge',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF28765D),
          surface: const Color(0xFFF4F5F1),
          surfaceContainerLowest: const Color(0xFFFFFFFF),
          surfaceContainerLow: const Color(0xFFFBFCF9),
          surfaceContainer: const Color(0xFFEFF3ED),
        ),
        scaffoldBackgroundColor: const Color(0xFFF4F5F1),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xE6F4F5F1),
          foregroundColor: Color(0xFF242A28),
          surfaceTintColor: Colors.transparent,
          scrolledUnderElevation: 0,
          elevation: 0,
        ),
        cardTheme: const CardThemeData(
          elevation: 0,
          color: Color(0xE8FBFCF9),
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(22)),
            side: BorderSide(color: Color(0xD9FFFFFF)),
          ),
        ),
        navigationBarTheme: const NavigationBarThemeData(
          backgroundColor: Colors.transparent,
          indicatorColor: Color(0xFFDCEBE1),
          elevation: 0,
          height: 72,
          labelTextStyle: WidgetStatePropertyAll(
            TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size(0, 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            side: const BorderSide(color: Color(0xFFD8E2D9)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            minimumSize: const Size(48, 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        iconButtonTheme: IconButtonThemeData(
          style: IconButton.styleFrom(
            minimumSize: const Size(48, 48),
            tapTargetSize: MaterialTapTargetSize.padded,
          ),
        ),
        dialogTheme: DialogThemeData(
          backgroundColor: const Color(0xF7FBFCF9),
          surfaceTintColor: Colors.transparent,
          elevation: 16,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color(0xD9FFFFFF)),
          ),
        ),
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: Color(0xF7FBFCF9),
          modalBackgroundColor: Color(0xF7FBFCF9),
          surfaceTintColor: Colors.transparent,
          showDragHandle: true,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
        ),
        inputDecorationTheme: const InputDecorationTheme(
          filled: true,
          fillColor: Color(0xF7FFFFFF),
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(15)),
            borderSide: BorderSide(color: Color(0xFFE0E6DF)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(15)),
            borderSide: BorderSide(color: Color(0xFFE0E6DF)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(15)),
            borderSide: BorderSide(color: Color(0xFF28765D), width: 1.5),
          ),
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: AuthGate(
        authRepository: authRepository,
        presentationRepository: presentationRepository,
        appStateStore: appStateStore,
      ),
    );
  }
}
