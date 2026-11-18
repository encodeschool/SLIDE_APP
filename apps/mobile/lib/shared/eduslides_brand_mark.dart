import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter/widgets.dart';

class EduslidesBrandMark extends StatelessWidget {
  const EduslidesBrandMark({super.key, this.size = 36});

  final double size;

  @override
  Widget build(BuildContext context) => SvgPicture.asset(
    'assets/eduslides-mark.svg',
    width: size,
    height: size,
    excludeFromSemantics: true,
  );
}
