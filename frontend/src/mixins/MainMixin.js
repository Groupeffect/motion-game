import { useRepo } from "pinia-orm"
import Interface from "@/models/Interface.js"
export default {
    name: 'MainMixin',
    data: () => ({}),
    computed: {
        $interface(){
            return useRepo(Interface).all()
        },
        $rest_framework(){
            return {"error":"not implemented","user":{"username":"demo"}}
        },
        $user(){
            return this.$rest_framework.user || null
        },
        $version(){
            return '0.0.2'
        }
    },
    methods: {
        $login(){
            // useRepo(Interface).save({id:1,name:"info",key:"active",value:true})
            useRepo(Interface).save({id:1,name:"rest_framework",key:"user",value:this.$rest_framework})
        },
        $logout(){},
        $checkUser(){
        },
    },
    mounted() {
        console.log("Mixin Mounted")
        // useRepo(Interface).save({id:1,name:"rest_framework",key:"user",value:this.$rest_framework})

    },
    created() {
        console.log("Mixin Created",this.$rest_framework)

    }
}