<template>
    <div class="base-title">
        <span class="title-name">{{ title }}</span>
    </div>
</template>

<script>
export default {
    name: 'BaseTitile',
    props: {
        title: {
            type: String,
            default: ''
        }
    }
}
</script>

<style scoped lang="less">
.base-title {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 36px;
    width: 100%;
    background: url('~@/assets/images/小标题.png');
    background-size: 100% 100%;
    box-sizing: border-box;

    .title-name {
        margin-left: 28px;
        font-family: JiangChengXieHei, JiangChengXieHei;
        font-weight: normal;
        font-size: 20px;
        color: #FFFFFF;
        text-align: left;
        font-style: oblique;
    }
}
</style>
