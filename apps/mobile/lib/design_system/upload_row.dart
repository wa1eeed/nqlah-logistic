import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

enum NqUploadState { uploaded, uploading, requiredEmpty, optionalEmpty }

/// Document upload row (handoff 4d/5e). Four states: uploaded, uploading,
/// required-not-yet (dashed mintS), optional (dashed bd).
class NqUploadRow extends StatelessWidget {
  const NqUploadRow({
    super.key,
    required this.title,
    required this.state,
    this.meta,
    this.progress = 0,
    this.onTap,
  });

  final String title;
  final NqUploadState state;
  final String? meta; // size when uploaded, "مطلوب"/"اختياري" otherwise
  final double progress; // 0..1 when uploading
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final dashed = state == NqUploadState.requiredEmpty ||
        state == NqUploadState.optionalEmpty;
    final borderColor = switch (state) {
      NqUploadState.requiredEmpty => c.mintS,
      NqUploadState.uploading => c.info,
      _ => c.bd,
    };

    final (tileBg, tileFg, iconName) = switch (state) {
      NqUploadState.uploaded => (c.okBg, c.ok, NqIcons.fileText),
      NqUploadState.uploading => (c.infoBg, c.info, NqIcons.fileText),
      _ => (c.sf2, c.tx3, NqIcons.uploadSimple),
    };

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: dashed ? Colors.transparent : c.sf,
        borderRadius: BorderRadius.circular(NqRadius.button),
        border: Border.all(
          color: borderColor,
          width: dashed ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: tileBg,
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: NqIcon(iconName, size: 20, color: tileFg),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(title,
                    style: NqType.labelStrong.copyWith(color: c.tx, fontSize: 15)),
                if (state == NqUploadState.uploading) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 4,
                      backgroundColor: c.sf2,
                      color: c.mintS,
                    ),
                  ),
                ] else if (meta != null) ...[
                  const SizedBox(height: 2),
                  Text(meta!, style: NqType.caption.copyWith(color: c.tx2)),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          _trailing(c),
        ],
      ),
    );
  }

  Widget _trailing(NqColors c) {
    switch (state) {
      case NqUploadState.uploaded:
        return Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.checkCircle, fill: true, size: 20, color: c.ok),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: onTap,
            child: NqIcon(NqIcons.trash, size: 20, color: c.tx3),
          ),
        ]);
      case NqUploadState.uploading:
        return GestureDetector(
          onTap: onTap,
          child: NqIcon('x', size: 20, color: c.tx3),
        );
      case NqUploadState.requiredEmpty:
      case NqUploadState.optionalEmpty:
        return GestureDetector(
          onTap: onTap,
          child: Text('رفع', style: NqType.labelStrong.copyWith(color: c.mintTx)),
        );
    }
  }
}
