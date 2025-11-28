import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import MainScreen from "../screens/MainScreen";
import ScanScreen from "../screens/ScanScreen";
import OcrScreen from "../screens/OcrScreen";
import InvoicePreviewScreen from "../screens/InvoicePreviewScreen";


const Stack = createNativeStackNavigator();

export function RootStack() {
    return (
        <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="Login" component={LoginScreen}/>
            <Stack.Screen name="SignUp" component={SignUpScreen}/>
            <Stack.Screen name="Main" component={MainScreen}/>
            <Stack.Screen name="Scan" component={ScanScreen}/>
            <Stack.Screen name="Ocr" component={OcrScreen}/>
            <Stack.Screen name="InvoicePreviewScreen" component={InvoicePreviewScreen} />
        </Stack.Navigator>
    );
}
