import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import MainScreen from "../screens/MainScreen";
import OcrScreen from "../screens/OcrScreen";
import InvoicePreview from "../screens/InvoicePreview";
import PurchaseOrderPreview from "../screens/PurchaseOrderPreview";



const Stack = createNativeStackNavigator();

export function RootStack() {
    return (
        <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="Login" component={LoginScreen}/>
            <Stack.Screen name="SignUp" component={SignUpScreen}/>
            <Stack.Screen name="Main" component={MainScreen}/>
            <Stack.Screen name="Ocr" component={OcrScreen}/>
            <Stack.Screen name="InvoicePreview" component={InvoicePreview}/>
            <Stack.Screen name="PurchaseOrder" component={PurchaseOrderPreview}/>

        </Stack.Navigator>
    );
}
