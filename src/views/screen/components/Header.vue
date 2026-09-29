<template>
    <div class="screen-header">
        <h1 class="header-title">高精度定位服务平台</h1>
        <div class="header-time">{{ now }}</div>
        <!-- <div class="header-line"></div> -->
    </div>
</template>

<script>
export default {
    name: 'Header',
    props: {
        now: {
            type: String,
            default: ''
        }
    }
}
</script>

<style scoped lang="less">
.screen-header {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 88px;
    width: 100%;
    text-align: center;
    background: url('~@/assets/images/header_bg.png');
    background-size: 100% 100%;
    box-sizing: border-box;

    .header-title {
        margin: 0;
        font-family: JiangChengXieHei, JiangChengXieHei;
        padding-top: 18px;
        text-align: center;
        font-size: 34px;
        letter-spacing: 6px;
        color: #eaf6ff;
        text-shadow: 0 0 18px rgba(0, 200, 255, 0.9), 0 0 40px rgba(0, 140, 255, 0.5);
    }

    .header-time {
        position: absolute;
        right: 20px;
        bottom: 10px;
    }
}
</style>
