import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/sync_provider.dart';

class OfflineCachedNotice extends StatelessWidget {
  const OfflineCachedNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final syncProvider = context.watch<SyncProvider>();
    final lastSyncedAt = syncProvider.lastCacheSyncAt;
    if (syncProvider.isConnected) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      color: Colors.orange.shade100,
      child: Row(
        children: [
          Icon(Icons.wifi_off, size: 18, color: Colors.orange.shade900),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Offline mode: showing cached data',
                  style: TextStyle(
                    color: Colors.orange.shade900,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (lastSyncedAt != null)
                  Text(
                    'Last synced: ${_formatLastSynced(context, lastSyncedAt)}',
                    style: TextStyle(
                      color: Colors.orange.shade800,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatLastSynced(BuildContext context, DateTime dateTime) {
    final local = dateTime.toLocal();
    final now = DateTime.now();
    final isToday = now.year == local.year &&
        now.month == local.month &&
        now.day == local.day;

    final time = MaterialLocalizations.of(context).formatTimeOfDay(
      TimeOfDay.fromDateTime(local),
      alwaysUse24HourFormat: false,
    );

    if (isToday) {
      return 'today at $time';
    }

    return '${local.day}/${local.month}/${local.year} $time';
  }
}
