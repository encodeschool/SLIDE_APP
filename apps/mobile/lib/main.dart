import 'package:flutter/material.dart';
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
  });

  final AuthRepository? authRepository;
  final PresentationRepository? presentationRepository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Slideforge',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF28765D),
          surface: const Color(0xFFF7F8F5),
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: AuthGate(
        authRepository: authRepository,
        presentationRepository: presentationRepository,
      ),
    );
  }
}
