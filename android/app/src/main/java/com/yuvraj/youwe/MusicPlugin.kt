package com.yuvraj.youwe

import android.content.ComponentName
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.common.util.concurrent.ListenableFuture

@CapacitorPlugin(name = "NativeMusic")
class MusicPlugin : Plugin() {

    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var mediaController: MediaController? = null

    override fun load() {
        super.load()
        val sessionToken = SessionToken(context, ComponentName(context, MusicService::class.java))
        controllerFuture = MediaController.Builder(context, sessionToken).buildAsync()
        controllerFuture?.addListener({
            mediaController = controllerFuture?.get()
            mediaController?.addListener(object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    val data = JSObject()
                    data.put("isPlaying", isPlaying)
                    notifyListeners("playbackStateChanged", data)
                }
                override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                    val data = JSObject()
                    data.put("url", mediaItem?.mediaId ?: "")
                    notifyListeners("trackChanged", data)
                }
            })
        }, ContextCompat.getMainExecutor(context))
    }

    @PluginMethod
    fun play(call: PluginCall) {
        val url = call.getString("url")
        if (url == null) {
            call.reject("Must provide url")
            return
        }
        activity.runOnUiThread {
            mediaController?.let {
                val mediaItem = MediaItem.Builder().setMediaId(url).setUri(url).build()
                it.setMediaItem(mediaItem)
                it.prepare()
                it.play()
                call.resolve()
            } ?: call.reject("MediaController not ready")
        }
    }

    @PluginMethod
    fun setQueue(call: PluginCall) {
        val urls = call.getArray("urls")
        if (urls == null) {
            call.reject("Must provide urls array")
            return
        }
        activity.runOnUiThread {
            mediaController?.let { controller ->
                val mediaItems = mutableListOf<MediaItem>()
                for (i in 0 until urls.length()) {
                    val url = urls.getString(i)
                    mediaItems.add(MediaItem.Builder().setMediaId(url).setUri(url).build())
                }
                controller.setMediaItems(mediaItems)
                controller.prepare()
                call.resolve()
            } ?: call.reject("MediaController not ready")
        }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        activity.runOnUiThread {
            mediaController?.pause()
            call.resolve()
        }
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        activity.runOnUiThread {
            mediaController?.play()
            call.resolve()
        }
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        val position = call.getLong("position")
        if (position == null) {
            call.reject("Must provide position")
            return
        }
        activity.runOnUiThread {
            mediaController?.seekTo(position)
            call.resolve()
        }
    }

    @PluginMethod
    fun next(call: PluginCall) {
        activity.runOnUiThread {
            mediaController?.seekToNext()
            call.resolve()
        }
    }

    @PluginMethod
    fun previous(call: PluginCall) {
        activity.runOnUiThread {
            mediaController?.seekToPrevious()
            call.resolve()
        }
    }

    @PluginMethod
    fun getCurrentTrack(call: PluginCall) {
        activity.runOnUiThread {
            val item = mediaController?.currentMediaItem
            val data = JSObject()
            data.put("url", item?.mediaId ?: "")
            call.resolve(data)
        }
    }

    @PluginMethod
    fun getPlaybackState(call: PluginCall) {
        activity.runOnUiThread {
            val data = JSObject()
            data.put("isPlaying", mediaController?.isPlaying ?: false)
            data.put("position", mediaController?.currentPosition ?: 0)
            data.put("duration", mediaController?.duration ?: 0)
            call.resolve(data)
        }
    }

    @PluginMethod
    fun requestIgnoreBatteryOptimization(call: PluginCall) {
        val intent = android.content.Intent()
        intent.action = android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
        intent.data = android.net.Uri.parse("package:" + context.packageName)
        intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
        call.resolve()
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        controllerFuture?.let { MediaController.releaseFuture(it) }
    }
}
